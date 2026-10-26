import type { Metadata } from "next";
import Link from "next/link";
import { notFoundOr } from "@/studio/clients/page-errors";
import { INVOICE_TRANSITIONS, PAYMENT_METHOD_LABELS, type InvoiceStatus } from "@/studio/db/constants";
import { getInvoiceView, type InvoiceView } from "@/studio/data/invoices";
import { formatAmount, formatDate, formatDateTime, formatPlainDate, statusLabel, studioToday } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import {
  changeInvoiceStatusAction,
  discardInvoiceAction,
  sendInvoiceAction,
} from "@/studio/invoices/actions";
import { formatQuantity } from "@/studio/invoices/money";
import ConfirmSubmit from "../../../_components/ConfirmSubmit";
import { InvoiceStatus as InvoiceStatusBadge } from "../../../_components/InvoiceRows";
import InvoiceStepDialog, { type InvoiceStepKind } from "../../../_components/InvoiceStepDialog";
import StatusBadge from "../../../_components/StatusBadge";
import { card, pageEyebrow, primaryButton, secondaryButton, textLink } from "../../../_components/ui";

// "Mark sent" renders and freezes the PDF from this page's action, so it needs Node and the bundled fonts.
export const runtime = "nodejs";
export const maxDuration = 30;

export const metadata: Metadata = {
  title: "Invoice · Studio",
  robots: { index: false, follow: false },
};

const muted = "text-stone-500 dark:text-stone-400";
const banner =
  "mt-6 rounded-lg border border-stone-400 bg-stone-300 px-4 py-3 text-sm font-semibold dark:border-stone-600 dark:bg-stone-800";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="mb-4 text-2xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Details({ view }: { view: InvoiceView }) {
  const { invoice } = view;
  const draft = invoice.status === "draft";
  const rows: [string, React.ReactNode][] = [
    ["Status", <InvoiceStatusBadge key="status" status={invoice.status} overdue={view.overdue} />],
    [
      "Client",
      <Link key="client" href={`/studio/clients/${view.client.id}`} className={textLink}>
        {view.client.name}
      </Link>,
    ],
    [
      "Contract",
      <Link key="contract" href={`/studio/contracts/${view.contract.id}`} className={textLink}>
        {view.contract.title}
      </Link>,
    ],
    ["Issue date", invoice.issuedOn ? formatPlainDate(invoice.issuedOn) : "Set when sent"],
    ["Due date", invoice.dueOn ? formatPlainDate(invoice.dueOn) : "Set when sent"],
    ["Payment terms", `${invoice.paymentTermsDays} ${invoice.paymentTermsDays === 1 ? "day" : "days"}`],
  ];
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      <dl className={`${card} grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 p-5 text-sm`}>
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="font-semibold">{term}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <div className={`${card} p-5 text-sm`}>
        <h2 className="font-semibold">Bill to</h2>
        <p className="mt-2 break-words font-semibold">{view.client.name}</p>
        {view.primaryContact && (
          <>
            <p className="break-words">{view.primaryContact.fullName}</p>
            {view.primaryContact.email && <p className="break-all">{view.primaryContact.email}</p>}
          </>
        )}
        {invoice.billToAddress && <p className="mt-2 whitespace-pre-line break-words">{invoice.billToAddress}</p>}
        {draft && !view.profile && (
          <p className="mt-4 text-amber-800 dark:text-amber-200">
            No billing profile yet.{" "}
            <Link href="/studio/invoices/profile" className={textLink}>
              Complete it
            </Link>{" "}
            before sending.
          </p>
        )}
      </div>
    </div>
  );
}

function Lines({ view }: { view: InvoiceView }) {
  const { invoice } = view;
  const cell = "px-3 py-2";
  return (
    <Section id="lines-title" title="Lines">
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-left dark:border-stone-700">
              <th scope="col" className={cell}>
                Description
              </th>
              <th scope="col" className={`${cell} text-right`}>
                Qty
              </th>
              <th scope="col" className={`${cell} text-right`}>
                Unit price
              </th>
              <th scope="col" className={`${cell} text-right`}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {view.lines.length === 0 && (
              <tr>
                <td colSpan={4} className={`${cell} ${muted}`}>
                  No lines yet.
                </td>
              </tr>
            )}
            {view.lines.map((line) => (
              <tr key={line.id} className="border-b border-stone-200 last:border-0 dark:border-stone-700">
                <td className={`${cell} break-words`}>{line.description}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatQuantity(line.quantityHundredths)}</td>
                <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>
                  {formatAmount(line.unitPriceMinor, invoice.currency)}
                </td>
                <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>
                  {formatAmount(line.amountMinor, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-400 dark:border-stone-600">
              <th scope="row" colSpan={3} className={`${cell} text-right`}>
                Total
              </th>
              <td className={`${cell} whitespace-nowrap text-right text-base font-semibold tabular-nums`}>
                {formatAmount(view.totalMinor, invoice.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {invoice.notes && (
        <div className={`${card} mt-4 p-5 text-sm`}>
          <h3 className="font-semibold">Notes</h3>
          <p className="mt-2 whitespace-pre-line break-words">{invoice.notes}</p>
        </div>
      )}
    </Section>
  );
}

function Payment({ view }: { view: InvoiceView }) {
  const { invoice } = view;
  if (invoice.status !== "paid" || !invoice.paidOn) {
    return null;
  }
  return (
    <Section id="payment-title" title="Payment">
      <dl className={`${card} grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-3 p-5 text-sm`}>
        <dt className="font-semibold">Paid on</dt>
        <dd>{formatPlainDate(invoice.paidOn)}</dd>
        <dt className="font-semibold">Method</dt>
        <dd>{invoice.paymentMethod ? PAYMENT_METHOD_LABELS[invoice.paymentMethod] : "—"}</dd>
        <dt className="font-semibold">Reference</dt>
        <dd className="break-words">{invoice.paymentReference ?? "—"}</dd>
      </dl>
    </Section>
  );
}

// Which dialog each step in INVOICE_TRANSITIONS uses, from the current status (AC-9).
function stepKind(from: InvoiceStatus, to: InvoiceStatus): InvoiceStepKind {
  if (to === "paid") {
    return "paid";
  }
  if (to === "void") {
    return "void";
  }
  return from === "draft" ? "send" : "undo";
}

function Steps({ view }: { view: InvoiceView }) {
  const { invoice } = view;
  const steps = INVOICE_TRANSITIONS[invoice.status];
  if (steps.length === 0) {
    return null;
  }
  const today = studioToday();
  return (
    <Section id="steps-title" title="Next steps">
      <div className="flex flex-wrap items-start gap-3">
        {steps.map((to) => {
          const kind = stepKind(invoice.status, to);
          return (
            <InvoiceStepDialog
              key={to}
              kind={kind}
              action={kind === "send" ? sendInvoiceAction : changeInvoiceStatusAction}
              fields={
                kind === "send"
                  ? { invoiceId: invoice.id, version: view.version }
                  : { invoiceId: invoice.id, from: invoice.status, to }
              }
              today={today}
              profileHref="/studio/invoices/profile"
            />
          );
        })}
      </div>
    </Section>
  );
}

function History({ view }: { view: InvoiceView }) {
  return (
    <Section id="history-title" title="Status history">
      <ol className="grid gap-3">
        {view.events.map((event) => (
          <li key={event.id} className={`${card} p-4 text-sm`}>
            <p className="flex flex-wrap items-center gap-2">
              {event.fromStatus ? (
                <>
                  <StatusBadge status={event.fromStatus} />
                  <span aria-label="to">→</span>
                  <StatusBadge status={event.toStatus} />
                </>
              ) : (
                <span className="font-semibold">Created</span>
              )}
              <time dateTime={event.changedAt.toISOString()} className={`${muted} ml-auto text-xs`}>
                {formatDateTime(event.changedAt)}
              </time>
            </p>
            {event.note && <p className="mt-2 whitespace-pre-wrap break-words">{event.note}</p>}
          </li>
        ))}
      </ol>
    </Section>
  );
}

export default async function InvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  await requireStudioAccess();
  const { invoiceId } = await params;

  let view: InvoiceView;
  try {
    view = await getInvoiceView(invoiceId);
  } catch (err) {
    notFoundOr(err);
  }
  const { invoice, client, contract } = view;
  const draftEditable = view.writable && invoice.status === "draft";

  return (
    <main className="container py-12 md:py-16">
      <Link href={invoice.archivedAt ? "/studio/invoices?archived=1" : "/studio/invoices"} className={`${textLink} text-sm`}>
        ← {invoice.archivedAt ? "Discarded drafts" : "All invoices"}
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={pageEyebrow}>
            Invoice · {client.name}
          </p>
          <h1 className="mt-2 break-words text-4xl md:text-5xl">{invoice.number ?? "Draft"}</h1>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{formatAmount(view.totalMinor, invoice.currency)}</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {draftEditable && (
            <Link href={`/studio/invoices/${invoice.id}/edit`} className={primaryButton}>
              Edit invoice
            </Link>
          )}
          {/* A plain link: the route streams the file, never a Blob URL (AC-13). */}
          <a href={`/studio/invoices/${invoice.id}/pdf`} className={secondaryButton}>
            Download PDF
          </a>
          {draftEditable && (
            <ConfirmSubmit
              action={discardInvoiceAction}
              fields={{ invoiceId: invoice.id }}
              triggerLabel="Discard draft"
              title="Discard this draft?"
              description="It leaves every invoice list and becomes read only. It never takes a number. There is no undo."
              confirmLabel="Discard draft"
            />
          )}
        </div>
      </div>

      {invoice.archivedAt && <p className={banner}>Discarded on {formatDate(invoice.archivedAt)}</p>}
      {!invoice.archivedAt && contract.archivedAt && (
        <p className={banner}>The contract is archived, so this invoice is read only.</p>
      )}
      {!invoice.archivedAt && !contract.archivedAt && client.archivedAt && (
        <p className={banner}>The client is archived, so this invoice is read only.</p>
      )}
      {invoice.status === "void" && (
        <p className={banner}>
          {statusLabel("void")}: this invoice keeps its number and its sent PDF, and needs no payment.
        </p>
      )}

      <Details view={view} />
      {view.writable && <Steps view={view} />}
      <Lines view={view} />
      <Payment view={view} />
      <History view={view} />
    </main>
  );
}
