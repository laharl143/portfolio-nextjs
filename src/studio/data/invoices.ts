import "server-only";
import "@/studio/marker";
import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNotNull, isNull, lt, sql, type SQL } from "drizzle-orm";
import type { InvoiceFilter } from "@/studio/clients/list-params";
import type { InvoicePdfInput } from "@/studio/invoices/pdf/render";
import { getDb, type Db, type Tx } from "@/studio/db/client";
import { INVOICE_TRANSITIONS, type ContractStatus, type InvoiceStatus } from "@/studio/db/constants";
import {
  billingProfiles,
  clients,
  contacts,
  contracts,
  invoiceFiles,
  invoiceLines,
  invoices,
  invoiceStatusEvents,
} from "@/studio/db/schema";
import { addDays, amountInputValue, formatAmount, formatPlainDate, studioToday } from "@/studio/format";
import { formatMoneyNumber, formatQuantity, invoiceTotalMinor } from "@/studio/invoices/money";
import { deletePrivateFile, putPrivatePdf } from "@/studio/storage/blob";
import { DEFAULT_PAYMENT_TERMS_DAYS, readBillingProfile, type BillingProfile } from "./billing-profiles";
import { lockClientThenContract, type Contract } from "./contracts";
import {
  BillingProfileMissing,
  ClientArchived,
  ContractArchived,
  ContractNotFound,
  ContractNotInvoiceable,
  FileStoreFailed,
  InvalidInput,
  InvalidInvoiceTransition,
  InvoiceArchived,
  InvoiceEmpty,
  InvoiceNotDiscardable,
  InvoiceNotEditable,
  InvoiceNotFound,
  InvoiceNumberRace,
  InvoiceStatusConflict,
  InvoiceTotalZero,
  StaleRecord,
} from "./errors";
import {
  PAID_ON_MESSAGE,
  isUuid,
  isVersion,
  parseInvoiceInput,
  type InvoiceFormInput,
  type InvoiceLineValues,
  type InvoiceStepValues,
} from "./input";
import { formatInvoiceNumber, peekNextNumber, takeNumber } from "./invoice-numbers";
import { invoiceFileExists, invoiceFilePathname, recordInvoiceFile } from "./invoice-files";
import { getWorkspaceId } from "./workspace";
import { invoiceRead } from "@/studio/invoices/read";

// Invoicing (spec 0013). Lock order everywhere: client, contract, invoice. Every write checks, in order: not found,
// InvoiceArchived, ContractArchived, ClientArchived, then the step or edit rules. Logs never carry invoice content.

export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLine = typeof invoiceLines.$inferSelect;

// Where "New invoice" is offered (AC-2). Checked only at creation.
export const INVOICEABLE_STATUSES: readonly ContractStatus[] = ["active", "ended"];
export const INVOICE_PAGE_SIZE = 25;

const invoiceVersion = sql<string>`${invoices.updatedAt}::text`;

// Overdue is derived, never stored: sent, and today in Asia/Manila is after the due date.
export function isOverdue(invoice: { status: InvoiceStatus; dueOn: string | null }, today = studioToday()): boolean {
  return invoice.status === "sent" && invoice.dueOn !== null && invoice.dueOn < today;
}

// Locks client, then contract, then the invoice. Does not judge archived rows; callers use assertWritable().
async function lockInvoice(tx: Tx, invoiceId: string, workspaceId: string) {
  if (!isUuid(invoiceId)) {
    throw new InvoiceNotFound();
  }
  const [found] = await tx
    .select({ contractId: invoices.contractId })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)));
  if (!found) {
    throw new InvoiceNotFound();
  }
  const { client, contract } = await lockClientThenContract(tx, found.contractId, workspaceId);
  const [invoice] = await tx
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .for("update");
  if (!invoice) {
    throw new InvoiceNotFound();
  }
  return { client, contract, invoice };
}

function assertWritable(found: {
  client: { archivedAt: Date | null };
  contract: { archivedAt: Date | null };
  invoice: { archivedAt: Date | null };
}) {
  if (found.invoice.archivedAt) {
    throw new InvoiceArchived();
  }
  if (found.contract.archivedAt) {
    throw new ContractArchived();
  }
  if (found.client.archivedAt) {
    throw new ClientArchived();
  }
}

async function insertLines(tx: Tx, invoice: Invoice, lines: InvoiceLineValues[]) {
  if (lines.length === 0) {
    return;
  }
  await tx.insert(invoiceLines).values(
    lines.map((line) => ({
      workspaceId: invoice.workspaceId,
      invoiceId: invoice.id,
      position: line.position,
      description: line.description,
      quantityHundredths: line.quantityHundredths,
      unitPriceMinor: line.unitPriceMinor,
      amountMinor: line.amountMinor,
    })),
  );
}

// Creates a draft from an active or ended contract, with its lines and opening event (AC-2). The client and currency
// come from the contract row read under its lock. `opts.id` is for the seed only.
export async function createInvoice(
  contractId: string,
  form: InvoiceFormInput,
  opts: { id?: string } = {},
): Promise<Invoice> {
  const values = parseInvoiceInput(form);
  const workspaceId = await getWorkspaceId();
  return getDb().transaction(async (tx) => {
    const { client, contract } = await lockClientThenContract(tx, contractId, workspaceId);
    if (contract.archivedAt) {
      throw new ContractNotInvoiceable();
    }
    if (client.archivedAt) {
      throw new ClientArchived();
    }
    if (!INVOICEABLE_STATUSES.includes(contract.status)) {
      throw new ContractNotInvoiceable();
    }
    const [invoice] = await tx
      .insert(invoices)
      .values({
        ...(opts.id ? { id: opts.id } : {}),
        workspaceId,
        clientId: contract.clientId,
        contractId: contract.id,
        status: "draft",
        paymentTermsDays: values.paymentTermsDays,
        currency: contract.currency,
        billToAddress: values.billToAddress,
        notes: values.notes,
      })
      .returning();
    await insertLines(tx, invoice, values.lines);
    await tx.insert(invoiceStatusEvents).values({
      workspaceId,
      invoiceId: invoice.id,
      fromStatus: null,
      toStatus: "draft",
    });
    return invoice;
  });
}

// The new invoice form (AC-2, Value sourcing): one line from the contract, terms from the profile, and the bill to
// address of this client's most recent live invoice.
export const getNewInvoiceDefaults = invoiceRead("getNewInvoiceDefaults", async function getNewInvoiceDefaults(contractId: string) {
  if (!isUuid(contractId)) {
    throw new ContractNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const db = getDb();
  const [contract] = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)));
  if (!contract) {
    throw new ContractNotFound();
  }
  const [[client], profile, [previous]] = await Promise.all([
    db
      .select({ id: clients.id, name: clients.name, archivedAt: clients.archivedAt })
      .from(clients)
      .where(and(eq(clients.id, contract.clientId), eq(clients.workspaceId, workspaceId))),
    readBillingProfile(db, workspaceId),
    db
      .select({ billToAddress: invoices.billToAddress })
      .from(invoices)
      .where(
        and(eq(invoices.clientId, contract.clientId), eq(invoices.workspaceId, workspaceId), isNull(invoices.archivedAt)),
      )
      .orderBy(desc(invoices.createdAt), desc(invoices.id))
      .limit(1),
  ]);
  if (!client) {
    throw new ContractNotFound();
  }
  return {
    contract,
    client,
    invoiceable: canInvoice(contract, client),
    initial: {
      lines: [
        {
          description: contract.title,
          quantity: "1",
          unitPrice: amountInputValue(contract.amountMinor),
        },
      ],
      paymentTermsDays: String(profile?.profile.defaultPaymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS),
      billToAddress: previous?.billToAddress ?? "",
      notes: "",
    },
  };
});

// "New invoice" shows only for a live active or ended contract of a live client (AC-2).
export function canInvoice(contract: Pick<Contract, "status" | "archivedAt">, client: { archivedAt: Date | null }) {
  return INVOICEABLE_STATUSES.includes(contract.status) && !contract.archivedAt && !client.archivedAt;
}

async function findInvoice(invoiceId: string) {
  if (!isUuid(invoiceId)) {
    throw new InvoiceNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [row] = await getDb()
    .select({ invoice: invoices, version: invoiceVersion })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)));
  if (!row) {
    throw new InvoiceNotFound();
  }
  return { ...row, workspaceId };
}

function primaryContactQuery(q: Db | Tx, clientId: string, workspaceId: string) {
  return q
    .select({ id: contacts.id, fullName: contacts.fullName, email: contacts.email })
    .from(contacts)
    .where(
      and(
        eq(contacts.clientId, clientId),
        eq(contacts.workspaceId, workspaceId),
        eq(contacts.isPrimary, true),
        isNull(contacts.archivedAt),
      ),
    )
    .limit(1);
}

// One invoice with everything its page and PDF need (AC-4).
export const getInvoiceView = invoiceRead("getInvoiceView", async function getInvoiceView(invoiceId: string) {
  const { invoice, version, workspaceId } = await findInvoice(invoiceId);
  const db = getDb();
  const [[client], [contract], [contact], lines, events, [file], profile] = await Promise.all([
    db
      .select({ id: clients.id, name: clients.name, archivedAt: clients.archivedAt })
      .from(clients)
      .where(and(eq(clients.id, invoice.clientId), eq(clients.workspaceId, workspaceId))),
    db
      .select({
        id: contracts.id,
        title: contracts.title,
        status: contracts.status,
        archivedAt: contracts.archivedAt,
      })
      .from(contracts)
      .where(and(eq(contracts.id, invoice.contractId), eq(contracts.workspaceId, workspaceId))),
    primaryContactQuery(db, invoice.clientId, workspaceId),
    db
      .select()
      .from(invoiceLines)
      .where(and(eq(invoiceLines.invoiceId, invoice.id), eq(invoiceLines.workspaceId, workspaceId)))
      .orderBy(asc(invoiceLines.position)),
    db
      .select({
        id: invoiceStatusEvents.id,
        fromStatus: invoiceStatusEvents.fromStatus,
        toStatus: invoiceStatusEvents.toStatus,
        changedAt: invoiceStatusEvents.changedAt,
        note: invoiceStatusEvents.note,
      })
      .from(invoiceStatusEvents)
      .where(and(eq(invoiceStatusEvents.invoiceId, invoice.id), eq(invoiceStatusEvents.workspaceId, workspaceId)))
      .orderBy(desc(invoiceStatusEvents.changedAt), desc(invoiceStatusEvents.createdAt)),
    db
      .select({ id: invoiceFiles.id, sizeBytes: invoiceFiles.sizeBytes, sha256: invoiceFiles.sha256 })
      .from(invoiceFiles)
      .where(and(eq(invoiceFiles.invoiceId, invoice.id), eq(invoiceFiles.workspaceId, workspaceId))),
    readBillingProfile(db, workspaceId),
  ]);
  if (!client || !contract) {
    throw new InvoiceNotFound();
  }
  return {
    invoice,
    version,
    client,
    contract,
    primaryContact: contact ?? null,
    lines,
    totalMinor: invoiceTotalMinor(lines),
    events,
    file: file ?? null,
    profile: profile?.profile ?? null,
    overdue: isOverdue(invoice),
    writable: !invoice.archivedAt && !contract.archivedAt && !client.archivedAt,
  };
});

export type InvoiceView = Awaited<ReturnType<typeof getInvoiceView>>;

// The PDF's values (AC-6, Value sourcing), from the view plus the number and dates being printed.
function pdfInput(
  view: Pick<InvoiceView, "invoice" | "client" | "contract" | "primaryContact" | "lines" | "totalMinor"> & {
    profile: BillingProfile | null;
  },
  printed: { number: string | null; issuedOn: string; dueOn: string },
): InvoicePdfInput {
  const { invoice, profile } = view;
  return {
    documentTitle: profile?.documentTitle ?? "Invoice",
    number: printed.number,
    business: profile
      ? {
          name: profile.businessName,
          address: profile.address,
          tin: profile.tin,
          email: profile.email,
          phone: profile.phone,
        }
      : null,
    billTo: {
      clientName: view.client.name,
      contactName: view.primaryContact?.fullName ?? null,
      contactEmail: view.primaryContact?.email ?? null,
      address: invoice.billToAddress,
    },
    issueDate: formatPlainDate(printed.issuedOn),
    dueDate: formatPlainDate(printed.dueOn),
    reference: view.contract.title,
    currency: invoice.currency,
    lines: view.lines.map((line) => ({
      description: line.description,
      quantity: formatQuantity(line.quantityHundredths),
      unitPrice: formatMoneyNumber(line.unitPriceMinor),
      amount: formatMoneyNumber(line.amountMinor),
    })),
    total: formatAmount(view.totalMinor, invoice.currency),
    notes: invoice.notes,
    paymentInstructions: profile?.paymentInstructions ?? null,
    taxNote: profile?.taxNote ?? null,
  };
}

// Loaded on first use, so the seed script (and every page that never renders) skips @react-pdf/renderer.
async function renderPdf(...args: Parameters<typeof import("@/studio/invoices/pdf/render").renderInvoicePdf>) {
  const { renderInvoicePdf } = await import("@/studio/invoices/pdf/render");
  return renderInvoicePdf(...args);
}

// The draft PDF (AC-6): made on demand, never stored, dated today and today plus the terms.
export async function renderDraftInvoicePdf(view: InvoiceView): Promise<Buffer> {
  const today = studioToday();
  return renderPdf(
    pdfInput(view, { number: null, issuedOn: today, dueOn: addDays(today, view.invoice.paymentTermsDays) }),
    { draft: true },
  );
}

export type InvoiceRow = {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  overdue: boolean;
  dueOn: string | null;
  currency: string;
  totalMinor: bigint;
  clientId: string;
  clientName: string;
  contractId: string;
  contractTitle: string;
  updatedAt: Date;
  archivedAt: Date | null;
};

const lineTotal = sql<string>`(select coalesce(sum(${invoiceLines.amountMinor}), 0)::text from ${invoiceLines} where ${invoiceLines.invoiceId} = ${invoices.id})`;

function rowSelection() {
  return {
    id: invoices.id,
    number: invoices.number,
    status: invoices.status,
    dueOn: invoices.dueOn,
    currency: invoices.currency,
    total: lineTotal,
    clientId: clients.id,
    clientName: clients.name,
    contractId: contracts.id,
    contractTitle: contracts.title,
    updatedAt: invoices.updatedAt,
    archivedAt: invoices.archivedAt,
  };
}

function toRows(rows: (Omit<InvoiceRow, "totalMinor" | "overdue"> & { total: string })[]): InvoiceRow[] {
  const today = studioToday();
  return rows.map(({ total, ...row }) => ({ ...row, totalMinor: BigInt(total), overdue: isOverdue(row, today) }));
}

function rowsQuery(where: SQL | undefined) {
  return getDb()
    .select(rowSelection())
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .innerJoin(contracts, eq(contracts.id, invoices.contractId))
    .where(where)
    .orderBy(desc(invoices.updatedAt), desc(invoices.id));
}

export type InvoiceList = { rows: InvoiceRow[]; total: number; page: number; pageSize: number };

// `/studio/invoices` (AC-11): live invoices, or discarded drafts with `archived`, newest change first.
export const listInvoices = invoiceRead("listInvoices", async function listInvoices(opts: {
  status: InvoiceFilter | null;
  archived: boolean;
  page: number;
}): Promise<InvoiceList> {
  const workspaceId = await getWorkspaceId();
  const conditions: SQL[] = [
    eq(invoices.workspaceId, workspaceId),
    opts.archived ? isNotNull(invoices.archivedAt) : isNull(invoices.archivedAt),
  ];
  if (opts.status === "overdue") {
    conditions.push(eq(invoices.status, "sent"), lt(invoices.dueOn, studioToday()));
  } else if (opts.status) {
    conditions.push(eq(invoices.status, opts.status));
  }
  const where = and(...conditions);
  const [rows, [counted]] = await Promise.all([
    rowsQuery(where)
      .limit(INVOICE_PAGE_SIZE)
      .offset((opts.page - 1) * INVOICE_PAGE_SIZE),
    getDb().select({ total: sql<number>`count(*)::int` }).from(invoices).where(where),
  ]);
  return { rows: toRows(rows), total: counted?.total ?? 0, page: opts.page, pageSize: INVOICE_PAGE_SIZE };
});

// The contract page's Invoices section (AC-11), with billed (sent plus paid) and paid totals.
export const listContractInvoices = invoiceRead("listContractInvoices", async function listContractInvoices(contractId: string) {
  if (!isUuid(contractId)) {
    return { rows: [] as InvoiceRow[], billedMinor: BigInt(0), paidMinor: BigInt(0) };
  }
  const workspaceId = await getWorkspaceId();
  const rows = toRows(
    await rowsQuery(
      and(eq(invoices.contractId, contractId), eq(invoices.workspaceId, workspaceId), isNull(invoices.archivedAt)),
    ),
  );
  const sum = (statuses: InvoiceStatus[]) =>
    rows.filter((row) => statuses.includes(row.status)).reduce((total, row) => total + row.totalMinor, BigInt(0));
  return { rows, billedMinor: sum(["sent", "paid"]), paidMinor: sum(["paid"]) };
});

// The client page's Invoices section (AC-11).
export const listClientInvoices = invoiceRead("listClientInvoices", async function listClientInvoices(clientId: string): Promise<InvoiceRow[]> {
  if (!isUuid(clientId)) {
    return [];
  }
  const workspaceId = await getWorkspaceId();
  return toRows(
    await rowsQuery(and(eq(invoices.clientId, clientId), eq(invoices.workspaceId, workspaceId), isNull(invoices.archivedAt))),
  );
});

// Edits a draft at the exact version the form saw (AC-5): fields updated, lines replaced, `updated_at` bumped.
export async function updateInvoice(invoiceId: string, version: string, form: InvoiceFormInput): Promise<Invoice> {
  const values = parseInvoiceInput(form);
  const workspaceId = await getWorkspaceId();
  return getDb().transaction(async (tx) => {
    const found = await lockInvoice(tx, invoiceId, workspaceId);
    assertWritable(found);
    if (found.invoice.status !== "draft") {
      throw new InvoiceNotEditable();
    }
    if (!isVersion(version)) {
      throw new StaleRecord();
    }
    const [updated] = await tx
      .update(invoices)
      .set({
        paymentTermsDays: values.paymentTermsDays,
        billToAddress: values.billToAddress,
        notes: values.notes,
        updatedAt: sql`now()`,
      })
      .where(and(eq(invoices.id, found.invoice.id), sql`${invoices.updatedAt} = ${version}::timestamptz`))
      .returning();
    if (!updated) {
      throw new StaleRecord();
    }
    await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, updated.id));
    await insertLines(tx, updated, values.lines);
    return updated;
  });
}

// The one place an invoice's status moves: one step from INVOICE_TRANSITIONS, the update (with any columns the
// step sets) and exactly one event, inside the caller's transaction and under its locks.
async function applyInvoiceStep(
  tx: Tx,
  invoice: Invoice,
  to: InvoiceStatus,
  note: string | null,
  set: Partial<Pick<Invoice, "number" | "issuedOn" | "dueOn" | "paidOn" | "paymentMethod" | "paymentReference">> = {},
) {
  if (!INVOICE_TRANSITIONS[invoice.status].includes(to)) {
    throw new InvalidInvoiceTransition(invoice.status, to);
  }
  const [updated] = await tx
    .update(invoices)
    .set({ ...set, status: to, updatedAt: sql`now()` })
    .where(and(eq(invoices.id, invoice.id), eq(invoices.status, invoice.status)))
    .returning();
  if (!updated) {
    throw new InvoiceStatusConflict();
  }
  const [event] = await tx
    .insert(invoiceStatusEvents)
    .values({ workspaceId: invoice.workspaceId, invoiceId: invoice.id, fromStatus: invoice.status, toStatus: to, note })
    .returning();
  return { invoice: updated, event };
}

// Mark paid, undo paid, and void (AC-9). `from` is the status the dialog was shown for; a mismatch is a conflict.
export async function changeInvoiceStatus(input: {
  invoiceId: string;
  from: string;
  to: InvoiceStatus;
  values: InvoiceStepValues;
}): Promise<Invoice> {
  const workspaceId = await getWorkspaceId();
  return getDb().transaction(async (tx) => {
    const found = await lockInvoice(tx, input.invoiceId, workspaceId);
    assertWritable(found);
    const { invoice } = found;
    if (invoice.status !== input.from) {
      throw new InvoiceStatusConflict();
    }
    // Leaving draft is sendInvoice() only, with its number and frozen PDF.
    if (invoice.status === "draft") {
      throw new InvalidInvoiceTransition(invoice.status, input.to);
    }
    const { values } = input;
    if (input.to === "paid") {
      const today = studioToday();
      if (!values.paidOn || !invoice.issuedOn || values.paidOn < invoice.issuedOn || values.paidOn > today) {
        throw new InvalidInput({ paidOn: PAID_ON_MESSAGE });
      }
      return (
        await applyInvoiceStep(tx, invoice, "paid", values.note, {
          paidOn: values.paidOn,
          paymentMethod: values.paymentMethod,
          paymentReference: values.paymentReference,
        })
      ).invoice;
    }
    if (input.to === "sent") {
      return (
        await applyInvoiceStep(tx, invoice, "sent", values.note, {
          paidOn: null,
          paymentMethod: null,
          paymentReference: null,
        })
      ).invoice;
    }
    return (await applyInvoiceStep(tx, invoice, input.to, values.note)).invoice;
  });
}

// The values printed in a PDF come only from these rows (plus the invoice and its lines, covered by the invoice
// version), so an equal stamp before render and under the locks proves every printed value is current (AC-7).
async function readRenderStamp(q: Db | Tx, invoice: Invoice): Promise<string> {
  const [[client], [contract], profile, [contact]] = await Promise.all([
    q
      .select({ version: sql<string>`${clients.updatedAt}::text` })
      .from(clients)
      .where(and(eq(clients.id, invoice.clientId), eq(clients.workspaceId, invoice.workspaceId))),
    q
      .select({ version: sql<string>`${contracts.updatedAt}::text` })
      .from(contracts)
      .where(and(eq(contracts.id, invoice.contractId), eq(contracts.workspaceId, invoice.workspaceId))),
    q
      .select({ version: sql<string>`${billingProfiles.updatedAt}::text` })
      .from(billingProfiles)
      .where(eq(billingProfiles.workspaceId, invoice.workspaceId)),
    q
      .select({ id: contacts.id, version: sql<string>`${contacts.updatedAt}::text` })
      .from(contacts)
      .where(
        and(
          eq(contacts.clientId, invoice.clientId),
          eq(contacts.workspaceId, invoice.workspaceId),
          eq(contacts.isPrimary, true),
          isNull(contacts.archivedAt),
        ),
      )
      .limit(1),
  ]);
  return [
    client?.version ?? "none",
    contract?.version ?? "none",
    profile[0]?.version ?? "none",
    contact ? `${contact.id}@${contact.version}` : "none",
  ].join("|");
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// Put first, transaction second (spec 0007 pattern): on any failure after the put, the Blob file is deleted only
// when no row with its id committed, so a dropped connection after commit never deletes a recorded file.
async function storeThenCommit<T>(
  file: { id: string; pathname: string; bytes: Buffer },
  commit: () => Promise<T>,
): Promise<T> {
  try {
    await putPrivatePdf(file.pathname, file.bytes);
  } catch {
    throw new FileStoreFailed();
  }
  try {
    return await commit();
  } catch (err) {
    try {
      if (!(await invoiceFileExists(file.id))) {
        await deletePrivateFile(file.pathname);
      }
    } catch {
      // Best effort: an orphan private file is never served (spec 0013, Consequences).
    }
    throw err;
  }
}

async function attemptSend(invoiceId: string, version: string): Promise<Invoice> {
  const head = await findInvoice(invoiceId);
  const db = getDb();
  // The stamp is read before the view, so a change after this point shows up as a different stamp at commit.
  const stamp = await readRenderStamp(db, head.invoice);
  const view = await getInvoiceView(invoiceId);
  const { invoice, profile } = view;
  assertWritable({ client: view.client, contract: view.contract, invoice });
  if (invoice.status !== "draft") {
    throw new InvalidInvoiceTransition(invoice.status, "sent");
  }
  if (!isVersion(version) || version !== view.version) {
    throw new StaleRecord();
  }
  if (view.lines.length === 0) {
    throw new InvoiceEmpty();
  }
  if (view.totalMinor <= BigInt(0)) {
    throw new InvoiceTotalZero();
  }
  if (!profile) {
    throw new BillingProfileMissing();
  }

  const issuedOn = studioToday();
  const dueOn = addDays(issuedOn, invoice.paymentTermsDays);
  const year = Number(issuedOn.slice(0, 4));
  const peeked = await peekNextNumber(db, head.workspaceId, year);
  const number = formatInvoiceNumber(year, peeked);
  const bytes = await renderPdf(pdfInput(view, { number, issuedOn, dueOn }), { draft: false });
  const fileId = randomUUID();
  const file = { id: fileId, pathname: invoiceFilePathname(head.workspaceId, invoice.id, fileId), bytes };

  return storeThenCommit(file, () =>
    db.transaction(async (tx) => {
      const found = await lockInvoice(tx, invoice.id, head.workspaceId);
      assertWritable(found);
      const [current] = await tx
        .select({ matches: sql<boolean>`${invoices.updatedAt} = ${version}::timestamptz` })
        .from(invoices)
        .where(eq(invoices.id, invoice.id));
      if (!current?.matches) {
        throw new StaleRecord();
      }
      if (found.invoice.status !== "draft") {
        throw new InvoiceStatusConflict();
      }
      if ((await readRenderStamp(tx, found.invoice)) !== stamp) {
        throw new StaleRecord();
      }
      // A different number means another send took the peeked one; the rollback leaves the counter unmoved.
      if ((await takeNumber(tx, head.workspaceId, year)) !== peeked) {
        throw new InvoiceNumberRace();
      }
      const step = await applyInvoiceStep(tx, found.invoice, "sent", null, { number, issuedOn, dueOn });
      await recordInvoiceFile(tx, {
        id: file.id,
        workspaceId: head.workspaceId,
        invoiceId: invoice.id,
        statusEventId: step.event.id,
        blobPathname: file.pathname,
        sizeBytes: bytes.length,
        sha256: sha256(bytes),
      });
      return step.invoice;
    }),
  );
}

// "Mark sent" (AC-7, AC-8): renders with the peeked number, stores the PDF, then one transaction takes the number,
// moves draft → sent, and records the file. Lost the number to another send: one automatic retry.
export async function sendInvoice(invoiceId: string, version: string): Promise<Invoice> {
  try {
    return await attemptSend(invoiceId, version);
  } catch (err) {
    if (!(err instanceof InvoiceNumberRace)) {
      throw err;
    }
  }
  return attemptSend(invoiceId, version);
}

// "Discard draft" (AC-10): archives a draft; a repeat discard comes back unchanged. No undo.
export async function discardInvoice(invoiceId: string): Promise<Invoice> {
  const workspaceId = await getWorkspaceId();
  return getDb().transaction(async (tx) => {
    const found = await lockInvoice(tx, invoiceId, workspaceId);
    if (found.invoice.archivedAt) {
      return found.invoice;
    }
    assertWritable(found);
    if (found.invoice.status !== "draft") {
      throw new InvoiceNotDiscardable();
    }
    const [discarded] = await tx
      .update(invoices)
      .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(invoices.id, found.invoice.id))
      .returning();
    return discarded;
  });
}
