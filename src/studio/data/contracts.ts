import "server-only";
import "@/studio/marker";
import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import { missingLabels } from "@/studio/contracts/placeholders";
import type { Watermark } from "@/studio/contracts/pdf/render";
import { resolveValues, sameValues, todayText, type ValueSources } from "@/studio/contracts/values";
import { getDb, type Db, type Tx } from "@/studio/db/client";
import type { BillingCadence, ContractStatus } from "@/studio/db/constants";
import { clients, contacts, contractFiles, contracts, contractStatusEvents, projects } from "@/studio/db/schema";
import { deletePrivateFile, putPrivatePdf } from "@/studio/storage/blob";
import { lockLiveClient } from "./clients";
import { contractFileExists, contractFilePathname, recordContractFile } from "./contract-files";
import { readLiveTemplateBody } from "./contract-templates";
import {
  ClientArchived,
  ContractArchived,
  ContractEmpty,
  ContractHasMissingValues,
  ContractNotArchivable,
  ContractNotEditable,
  ContractNotFound,
  ContractNotSigned,
  ContractStatusConflict,
  FileStoreFailed,
  InvalidContractInput,
  InvalidContractTransition,
  ProjectNotFound,
  StaleRecord,
} from "./errors";
import { isUuid, isVersion, parseContractInput, type ContractFormInput } from "./input";
import { getWorkspaceId } from "./workspace";

export type Contract = typeof contracts.$inferSelect;

// The allowed contract steps (spec 0004, AC-3). The only source changeContractStatus() and the contract screens read.
export const CONTRACT_TRANSITIONS: Record<ContractStatus, readonly ContractStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["draft", "signed", "cancelled"],
  signed: ["active", "cancelled"],
  active: ["ended"],
  ended: [],
  cancelled: [],
};

export const ARCHIVABLE_STATUSES: readonly ContractStatus[] = ["draft", "ended", "cancelled"];
// Where "Add signed copy" is offered (spec 0007, AC-8).
export const SIGNED_COPY_STATUSES: readonly ContractStatus[] = ["signed", "active", "ended"];
export const CONTRACT_PAGE_SIZE = 25;
export const SIGNED_COPY_MAX_BYTES = 4 * 1024 * 1024;

export type CreateContractInput = {
  clientId: string;
  title: string;
  projectId?: string | null;
  amountMinor?: bigint | number | null;
  currency?: string;
  billingCadence?: BillingCadence | null;
  startDate?: string | null;
  endDate?: string | null;
  termsSummary?: string | null;
  // A live template whose body is copied onto the contract; null or absent for Blank.
  templateId?: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toAmountMinor(amount: bigint | number | null | undefined): bigint | null {
  if (amount === undefined || amount === null) {
    return null;
  }
  if (typeof amount === "number" && !Number.isSafeInteger(amount)) {
    throw new InvalidContractInput("amount must be a whole number of centavos");
  }
  const value = BigInt(amount);
  if (value < BigInt(0)) {
    throw new InvalidContractInput("amount cannot be negative");
  }
  return value;
}

function toDate(value: string | null | undefined, label: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new InvalidContractInput(`${label} must be a YYYY-MM-DD date`);
  }
  return value;
}

function validateCreateInput(input: CreateContractInput) {
  const title = input.title.trim();
  if (!title) {
    throw new InvalidContractInput("title is required");
  }
  const currency = input.currency?.trim().toUpperCase();
  if (currency !== undefined && !/^[A-Z]{3}$/.test(currency)) {
    throw new InvalidContractInput("currency must be three letters");
  }
  const startDate = toDate(input.startDate, "start date");
  const endDate = toDate(input.endDate, "end date");
  if (startDate && endDate && endDate < startDate) {
    throw new InvalidContractInput("end date is before start date");
  }
  return {
    title,
    currency,
    startDate,
    endDate,
    amountMinor: toAmountMinor(input.amountMinor),
    termsSummary: input.termsSummary?.trim() || null,
  };
}

// A live project of this client, or ProjectNotFound. `keepId` lets an edit keep its current project even if archived.
async function assertProject(tx: Tx, projectId: string, clientId: string, workspaceId: string, keepId?: string | null) {
  const [project] = await tx
    .select({ id: projects.id, archivedAt: projects.archivedAt })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, clientId), eq(projects.workspaceId, workspaceId)));
  if (!project || (project.archivedAt && project.id !== keepId)) {
    throw new ProjectNotFound();
  }
}

// Lock order is always client row, then contract row (spec 0004). Finds the contract's client (it never changes),
// then takes both locks in order. Does not judge archived rows; callers check in the spec 0007 order.
async function lockClientThenContract(tx: Tx, contractId: string, workspaceId: string) {
  if (!isUuid(contractId)) {
    throw new ContractNotFound();
  }
  const [found] = await tx
    .select({ clientId: contracts.clientId })
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)));
  if (!found) {
    throw new ContractNotFound();
  }
  const [client] = await tx
    .select()
    .from(clients)
    .where(and(eq(clients.id, found.clientId), eq(clients.workspaceId, workspaceId)))
    .for("update");
  const [contract] = await tx
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)))
    .for("update");
  if (!client || !contract) {
    throw new ContractNotFound();
  }
  return { client, contract };
}

// Error check order in every contract write (spec 0007): not found, contract archived, client archived, then the rules.
function assertWritable(found: { client: { archivedAt: Date | null }; contract: Contract }) {
  if (found.contract.archivedAt) {
    throw new ContractArchived();
  }
  if (found.client.archivedAt) {
    throw new ClientArchived();
  }
}

// Inserts a draft contract and its opening event in one transaction (spec 0004, AC-3; spec 0007, AC-2): the chosen
// template's body is copied onto it. `opts.id` is for the seed only, so its rows keep fixed ids.
export async function createContract(input: CreateContractInput, opts: { id?: string } = {}): Promise<Contract> {
  const values = validateCreateInput(input);

  return getDb().transaction(async (tx) => {
    const client = await lockLiveClient(tx, input.clientId);
    if (input.projectId) {
      await assertProject(tx, input.projectId, client.id, client.workspaceId);
    }
    const body = input.templateId ? await readLiveTemplateBody(tx, input.templateId, client.workspaceId) : "";

    const [contract] = await tx
      .insert(contracts)
      .values({
        ...(opts.id ? { id: opts.id } : {}),
        workspaceId: client.workspaceId,
        clientId: client.id,
        projectId: input.projectId ?? null,
        title: values.title,
        status: "draft",
        amountMinor: values.amountMinor,
        ...(values.currency ? { currency: values.currency } : {}),
        billingCadence: input.billingCadence ?? null,
        startDate: values.startDate,
        endDate: values.endDate,
        termsSummary: values.termsSummary,
        templateId: input.templateId ?? null,
        body,
      })
      .returning();

    await tx.insert(contractStatusEvents).values({
      workspaceId: contract.workspaceId,
      contractId: contract.id,
      fromStatus: null,
      toStatus: "draft",
    });

    return contract;
  });
}

// The new contract form (spec 0007, AC-2). Currency is always the column default, PHP.
export async function createContractFromForm(
  clientId: string,
  form: ContractFormInput & { templateId?: string },
): Promise<Contract> {
  const values = parseContractInput(form, { withTemplate: true });
  return createContract({
    clientId,
    title: values.title,
    projectId: values.projectId,
    amountMinor: values.amountMinor,
    billingCadence: values.billingCadence,
    startDate: values.startDate,
    endDate: values.endDate,
    termsSummary: values.termsSummary,
    templateId: values.templateId ?? null,
  });
}

// The rows behind the placeholder values (spec 0007, Placeholders): client name, the live primary contact, and the
// contract's project (archived or not).
async function loadValueSources(q: Db | Tx, contract: Contract): Promise<ValueSources> {
  const [[client], [contact], [project]] = await Promise.all([
    q
      .select({ name: clients.name })
      .from(clients)
      .where(and(eq(clients.id, contract.clientId), eq(clients.workspaceId, contract.workspaceId))),
    q
      .select({ fullName: contacts.fullName, email: contacts.email })
      .from(contacts)
      .where(
        and(
          eq(contacts.clientId, contract.clientId),
          eq(contacts.workspaceId, contract.workspaceId),
          eq(contacts.isPrimary, true),
          isNull(contacts.archivedAt),
        ),
      )
      .limit(1),
    contract.projectId
      ? q
          .select({ name: projects.name })
          .from(projects)
          .where(and(eq(projects.id, contract.projectId), eq(projects.workspaceId, contract.workspaceId)))
      : Promise.resolve([] as { name: string }[]),
  ]);
  return {
    contract,
    clientName: client?.name ?? "",
    primaryContact: contact ?? null,
    projectName: project?.name ?? null,
  };
}

async function findContract(contractId: string) {
  if (!isUuid(contractId)) {
    throw new ContractNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [row] = await getDb()
    .select({ contract: contracts, version: sql<string>`${contracts.updatedAt}::text` })
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)));
  if (!row) {
    throw new ContractNotFound();
  }
  return { ...row, workspaceId };
}

// What a contract's PDF watermark is when it is rendered on demand (spec 0007, Value sourcing).
function draftWatermark(status: ContractStatus, wasSent: boolean): Watermark {
  return status === "draft" || !wasSent ? "DRAFT" : "NOT THE SENT COPY";
}

// One contract with everything its page, preview, and PDF need (spec 0007, AC-3).
export async function getContractView(contractId: string) {
  const { contract, version, workspaceId } = await findContract(contractId);
  const db = getDb();

  const [sources, [client], events, files] = await Promise.all([
    loadValueSources(db, contract),
    db
      .select({ id: clients.id, name: clients.name, archivedAt: clients.archivedAt })
      .from(clients)
      .where(and(eq(clients.id, contract.clientId), eq(clients.workspaceId, workspaceId))),
    db
      .select({
        id: contractStatusEvents.id,
        fromStatus: contractStatusEvents.fromStatus,
        toStatus: contractStatusEvents.toStatus,
        changedAt: contractStatusEvents.changedAt,
        note: contractStatusEvents.note,
      })
      .from(contractStatusEvents)
      .where(and(eq(contractStatusEvents.contractId, contract.id), eq(contractStatusEvents.workspaceId, workspaceId)))
      .orderBy(desc(contractStatusEvents.changedAt), desc(contractStatusEvents.createdAt)),
    db
      .select({
        id: contractFiles.id,
        kind: contractFiles.kind,
        sizeBytes: contractFiles.sizeBytes,
        createdAt: contractFiles.createdAt,
        eventChangedAt: contractStatusEvents.changedAt,
      })
      .from(contractFiles)
      .leftJoin(contractStatusEvents, eq(contractStatusEvents.id, contractFiles.statusEventId))
      .where(and(eq(contractFiles.contractId, contract.id), eq(contractFiles.workspaceId, workspaceId)))
      .orderBy(desc(contractFiles.createdAt), desc(contractFiles.id)),
  ]);
  if (!client) {
    throw new ContractNotFound();
  }

  const latestEvent = (to: ContractStatus) => events.find((event) => event.toStatus === to)?.changedAt ?? null;
  const latestSent = files.find((file) => file.kind === "sent_pdf") ?? null;
  const wasSent = events.some((event) => event.toStatus === "sent");

  return {
    contract,
    version,
    client,
    projectName: sources.projectName,
    events,
    files: files.map((file) => ({
      ...file,
      // "Sent on" uses the linked event; signed copies show their own upload time.
      shownAt: file.kind === "sent_pdf" ? (file.eventChangedAt ?? file.createdAt) : file.createdAt,
      replaced: file.kind === "sent_pdf" && file.id !== latestSent?.id,
    })),
    sentAt: latestEvent("sent"),
    signedAt: latestEvent("signed"),
    values: resolveValues(sources, todayText()),
    // The PDF route serves this stored file byte for byte while the contract is not a draft.
    frozenPdfId: contract.status !== "draft" && latestSent ? latestSent.id : null,
    watermark: draftWatermark(contract.status, wasSent),
  };
}

export type ContractView = Awaited<ReturnType<typeof getContractView>>;

// The edit form (spec 0007, AC-4): the contract, its version, and the client's live projects plus its current one.
export async function getContractForEdit(contractId: string) {
  const { contract, version, workspaceId } = await findContract(contractId);
  const db = getDb();
  const [[client], projectRows] = await Promise.all([
    db
      .select({ id: clients.id, name: clients.name, archivedAt: clients.archivedAt })
      .from(clients)
      .where(and(eq(clients.id, contract.clientId), eq(clients.workspaceId, workspaceId))),
    db
      .select({ id: projects.id, name: projects.name, archivedAt: projects.archivedAt })
      .from(projects)
      .where(and(eq(projects.clientId, contract.clientId), eq(projects.workspaceId, workspaceId)))
      .orderBy(sql`lower(${projects.name})`, asc(projects.id)),
  ]);
  if (!client) {
    throw new ContractNotFound();
  }
  return {
    contract,
    version,
    client,
    projects: projectRows.filter((project) => !project.archivedAt || project.id === contract.projectId),
  };
}

export type ContractRow = {
  id: string;
  title: string;
  status: ContractStatus;
  amountMinor: bigint | null;
  currency: string;
  clientId: string;
  clientName: string;
  lastChangeAt: Date;
};

export type ContractList = { rows: ContractRow[]; total: number; page: number; pageSize: number };

// Last status change per contract (draft edits do not move a contract; intended).
const lastChange = sql`(select max(${contractStatusEvents.changedAt}) from ${contractStatusEvents} where ${contractStatusEvents.contractId} = ${contracts.id})`;

function rowSelection() {
  return {
    id: contracts.id,
    title: contracts.title,
    status: contracts.status,
    amountMinor: contracts.amountMinor,
    currency: contracts.currency,
    clientId: clients.id,
    clientName: clients.name,
    lastChangeAt: lastChange.mapWith(contracts.updatedAt),
  };
}

// `/studio/contracts` (spec 0007, AC-9): live contracts, or archived only, newest change first.
export async function listContracts(opts: {
  status: ContractStatus | null;
  archived: boolean;
  page: number;
}): Promise<ContractList> {
  const workspaceId = await getWorkspaceId();
  const conditions: SQL[] = [
    eq(contracts.workspaceId, workspaceId),
    opts.archived ? isNotNull(contracts.archivedAt) : isNull(contracts.archivedAt),
  ];
  if (opts.status) {
    conditions.push(eq(contracts.status, opts.status));
  }
  const where = and(...conditions);
  const db = getDb();
  const [rows, [counted]] = await Promise.all([
    db
      .select(rowSelection())
      .from(contracts)
      .innerJoin(clients, eq(clients.id, contracts.clientId))
      .where(where)
      .orderBy(sql`${lastChange} desc`, desc(contracts.id))
      .limit(CONTRACT_PAGE_SIZE)
      .offset((opts.page - 1) * CONTRACT_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(contracts).where(where),
  ]);
  return { rows, total: counted?.total ?? 0, page: opts.page, pageSize: CONTRACT_PAGE_SIZE };
}

// The client page's Contracts section: its live contracts, newest change first.
export async function listClientContracts(clientId: string): Promise<ContractRow[]> {
  if (!isUuid(clientId)) {
    return [];
  }
  const workspaceId = await getWorkspaceId();
  return getDb()
    .select(rowSelection())
    .from(contracts)
    .innerJoin(clients, eq(clients.id, contracts.clientId))
    .where(and(eq(contracts.clientId, clientId), eq(contracts.workspaceId, workspaceId), isNull(contracts.archivedAt)))
    .orderBy(sql`${lastChange} desc`, desc(contracts.id));
}

// Edits only a draft, at the exact version the form saw (spec 0007, AC-4).
export async function updateContract(contractId: string, version: string, form: ContractFormInput): Promise<Contract> {
  const values = parseContractInput(form, { withBody: true });
  const workspaceId = await getWorkspaceId();
  return getDb().transaction(async (tx) => {
    const found = await lockClientThenContract(tx, contractId, workspaceId);
    assertWritable(found);
    const { contract } = found;
    if (contract.status !== "draft") {
      throw new ContractNotEditable();
    }
    if (!isVersion(version)) {
      throw new StaleRecord();
    }
    if (values.projectId) {
      await assertProject(tx, values.projectId, contract.clientId, workspaceId, contract.projectId);
    }
    const [updated] = await tx
      .update(contracts)
      .set({
        title: values.title,
        projectId: values.projectId,
        amountMinor: values.amountMinor,
        billingCadence: values.billingCadence,
        startDate: values.startDate,
        endDate: values.endDate,
        termsSummary: values.termsSummary,
        body: values.body ?? "",
      })
      .where(and(eq(contracts.id, contract.id), sql`${contracts.updatedAt} = ${version}::timestamptz`))
      .returning();
    if (!updated) {
      throw new StaleRecord();
    }
    return updated;
  });
}

// The one place a contract's status moves (spec 0004 and 0007): one step from CONTRACT_TRANSITIONS, the update and
// exactly one event row, inside the caller's transaction and under its client then contract locks.
async function applyStatusStep(tx: Tx, contract: Contract, to: ContractStatus, note: string | null) {
  if (!CONTRACT_TRANSITIONS[contract.status].includes(to)) {
    throw new InvalidContractTransition(contract.status, to);
  }
  const [updated] = await tx
    .update(contracts)
    .set({ status: to })
    .where(and(eq(contracts.id, contract.id), eq(contracts.status, contract.status)))
    .returning();
  if (!updated) {
    throw new ContractStatusConflict();
  }
  const [event] = await tx
    .insert(contractStatusEvents)
    .values({
      workspaceId: contract.workspaceId,
      contractId: contract.id,
      fromStatus: contract.status,
      toStatus: to,
      note,
    })
    .returning();
  return { contract: updated, event };
}

// A plain status step, no file (spec 0004, AC-3 and AC-4; spec 0007, AC-7). The send step with its frozen PDF is
// sendContract(); the seed walks its contracts through here, so seeded sent contracts have no frozen PDF.
export async function changeContractStatus(input: {
  contractId: string;
  to: ContractStatus;
  note?: string | null;
}): Promise<Contract> {
  const workspaceId = await getWorkspaceId();
  const note = input.note?.trim() || null;
  return getDb().transaction(async (tx) => {
    const found = await lockClientThenContract(tx, input.contractId, workspaceId);
    assertWritable(found);
    return (await applyStatusStep(tx, found.contract, input.to, note)).contract;
  });
}

// Loaded on first use, so the seed script (and every page that never renders) skips @react-pdf/renderer.
async function renderPdf(...args: Parameters<typeof import("@/studio/contracts/pdf/render").renderContractPdf>) {
  const { renderContractPdf } = await import("@/studio/contracts/pdf/render");
  return renderContractPdf(...args);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// Put first, transaction second (spec 0007): on any failure after the put, the Blob file is deleted only when no
// row with its id committed, so a dropped connection after commit never deletes a recorded file.
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
      if (!(await contractFileExists(file.id))) {
        await deletePrivateFile(file.pathname);
      }
    } catch {
      // Best effort: an orphan private file is never served (spec 0007, Consequences).
    }
    throw err;
  }
}

function newFile(workspaceId: string, contractId: string, bytes: Buffer) {
  const id = randomUUID();
  return { id, pathname: contractFilePathname(workspaceId, contractId, id), bytes };
}

// "Mark sent" (spec 0007, AC-6): checks, renders the PDF without a watermark, saves it to private Blob, then one
// transaction moves the contract draft → sent, writes its event, and records the file linked to that event.
export async function sendContract(input: { contractId: string; version: string; note?: string | null }) {
  const note = input.note?.trim() || null;
  const { contract, version } = await findContract(input.contractId);
  const workspaceId = contract.workspaceId;
  const db = getDb();
  const [client] = await db
    .select({ archivedAt: clients.archivedAt })
    .from(clients)
    .where(and(eq(clients.id, contract.clientId), eq(clients.workspaceId, workspaceId)));
  assertWritable({ client: { archivedAt: client?.archivedAt ?? null }, contract });
  if (contract.status !== "draft") {
    throw new InvalidContractTransition(contract.status, "sent");
  }
  if (!isVersion(input.version) || input.version !== version) {
    throw new StaleRecord();
  }
  if (!contract.body.trim()) {
    throw new ContractEmpty();
  }

  const today = todayText();
  const values = resolveValues(await loadValueSources(db, contract), today);
  const missing = missingLabels(contract.body, values);
  if (missing.length > 0) {
    throw new ContractHasMissingValues(missing);
  }

  const bytes = await renderPdf({ title: contract.title, body: contract.body, values }, { watermark: null });
  const file = newFile(workspaceId, contract.id, bytes);

  return storeThenCommit(file, () =>
    db.transaction(async (tx) => {
      const found = await lockClientThenContract(tx, contract.id, workspaceId);
      assertWritable(found);
      const [current] = await tx
        .select({ matches: sql<boolean>`${contracts.updatedAt} = ${input.version}::timestamptz` })
        .from(contracts)
        .where(eq(contracts.id, contract.id));
      if (!current?.matches) {
        throw new StaleRecord();
      }
      if (found.contract.status !== "draft") {
        throw new ContractStatusConflict();
      }
      // A client, contact, or project value that changed while the PDF rendered makes the PDF stale.
      const committed = resolveValues(await loadValueSources(tx, found.contract), today);
      if (!sameValues(values, committed)) {
        throw new StaleRecord();
      }
      const step = await applyStatusStep(tx, found.contract, "sent", note);
      await recordContractFile(tx, {
        id: file.id,
        workspaceId,
        contractId: contract.id,
        kind: "sent_pdf",
        statusEventId: step.event.id,
        blobPathname: file.pathname,
        sizeBytes: bytes.length,
        sha256: sha256(bytes),
      });
      return step.contract;
    }),
  );
}

// Checks a contract outside a transaction before a file upload, so an upload that would be refused is never stored.
async function precheck(contractId: string, check: (contract: Contract) => void) {
  const { contract } = await findContract(contractId);
  const [client] = await getDb()
    .select({ archivedAt: clients.archivedAt })
    .from(clients)
    .where(and(eq(clients.id, contract.clientId), eq(clients.workspaceId, contract.workspaceId)));
  assertWritable({ client: { archivedAt: client?.archivedAt ?? null }, contract });
  check(contract);
  return contract;
}

// "Mark signed" with a signed copy (spec 0007, AC-8): the file is stored, then the step and the file row commit
// together, the file linked to the signed event. The bytes are already checked (PDF, at most 4 MB) by the action.
export async function signContractWithCopy(input: { contractId: string; note?: string | null; bytes: Buffer }) {
  const note = input.note?.trim() || null;
  const contract = await precheck(input.contractId, (c) => {
    if (!CONTRACT_TRANSITIONS[c.status].includes("signed")) {
      throw new InvalidContractTransition(c.status, "signed");
    }
  });
  const file = newFile(contract.workspaceId, contract.id, input.bytes);
  return storeThenCommit(file, () =>
    getDb().transaction(async (tx) => {
      const found = await lockClientThenContract(tx, contract.id, contract.workspaceId);
      assertWritable(found);
      const step = await applyStatusStep(tx, found.contract, "signed", note);
      await recordContractFile(tx, {
        id: file.id,
        workspaceId: contract.workspaceId,
        contractId: contract.id,
        kind: "signed_copy",
        statusEventId: step.event.id,
        blobPathname: file.pathname,
        sizeBytes: input.bytes.length,
        sha256: sha256(input.bytes),
      });
      return step.contract;
    }),
  );
}

// "Add signed copy" on a signed, active, or ended contract (spec 0007, AC-8). No status change.
export async function addSignedCopy(input: { contractId: string; bytes: Buffer }) {
  const check = (c: Contract) => {
    if (!SIGNED_COPY_STATUSES.includes(c.status)) {
      throw new ContractNotSigned();
    }
  };
  const contract = await precheck(input.contractId, check);
  const file = newFile(contract.workspaceId, contract.id, input.bytes);
  return storeThenCommit(file, () =>
    getDb().transaction(async (tx) => {
      const found = await lockClientThenContract(tx, contract.id, contract.workspaceId);
      assertWritable(found);
      check(found.contract);
      return recordContractFile(tx, {
        id: file.id,
        workspaceId: contract.workspaceId,
        contractId: contract.id,
        kind: "signed_copy",
        statusEventId: null,
        blobPathname: file.pathname,
        sizeBytes: input.bytes.length,
        sha256: sha256(input.bytes),
      });
    }),
  );
}

// The on demand PDF (spec 0007, AC-5): never stored, watermarked by the view's rule.
export async function renderDraftPdf(view: ContractView): Promise<Buffer> {
  return renderPdf(
    { title: view.contract.title, body: view.contract.body, values: view.values },
    { watermark: view.watermark },
  );
}

// Archives a draft, ended, or cancelled contract (spec 0004, AC-6; spec 0007, AC-10). An archived contract comes
// back unchanged.
export async function archiveContract(contractId: string): Promise<Contract> {
  const workspaceId = await getWorkspaceId();
  return getDb().transaction(async (tx) => {
    const { client, contract } = await lockClientThenContract(tx, contractId, workspaceId);
    if (contract.archivedAt) {
      return contract;
    }
    if (client.archivedAt) {
      throw new ClientArchived();
    }
    if (!ARCHIVABLE_STATUSES.includes(contract.status)) {
      throw new ContractNotArchivable(contract.status);
    }
    const [archived] = await tx
      .update(contracts)
      .set({ archivedAt: sql`now()` })
      .where(eq(contracts.id, contract.id))
      .returning();
    return archived;
  });
}
