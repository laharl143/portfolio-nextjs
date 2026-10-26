import type { Metadata } from "next";
import Link from "next/link";
import { notFoundOr } from "@/studio/clients/page-errors";
import {
  addSignedCopyAction,
  archiveContractAction,
  changeContractStatusAction,
} from "@/studio/contracts/actions";
import { missingLabels } from "@/studio/contracts/placeholders";
import type { ContractStatus } from "@/studio/db/constants";
import {
  ARCHIVABLE_STATUSES,
  CONTRACT_TRANSITIONS,
  SIGNED_COPY_STATUSES,
  getContractView,
  type ContractView,
} from "@/studio/data/contracts";
import { canInvoice, listContractInvoices } from "@/studio/data/invoices";
import { formatAmount, formatDate, formatDateTime, formatPlainDate, statusLabel } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import AddSignedCopyForm from "../../../_components/AddSignedCopyForm";
import ConfirmSubmit from "../../../_components/ConfirmSubmit";
import ContractBody from "../../../_components/ContractBody";
import InvoiceRows from "../../../_components/InvoiceRows";
import StatusBadge from "../../../_components/StatusBadge";
import StepDialog from "../../../_components/StepDialog";
import { card, pageEyebrow, primaryButton, secondaryButton, textLink } from "../../../_components/ui";

// The sent PDF is frozen from this page's action, so it needs Node and the bundled fonts (spec 0007, PDF rendering).
export const runtime = "nodejs";
export const maxDuration = 30;

export const metadata: Metadata = {
  title: "Contract · Studio",
  robots: { index: false, follow: false },
};

const muted = "text-stone-500 dark:text-stone-400";
const sectionTitle = "text-2xl font-semibold";

// Labels and dialog text for each step in CONTRACT_TRANSITIONS (spec 0007, AC-7).
const STEPS: Record<ContractStatus, { label: string; description: string; danger?: boolean }> = {
  draft: {
    label: "Back to draft",
    description: "The contract becomes editable again. The sent PDF stays in the files list, marked replaced.",
  },
  sent: {
    label: "Mark sent",
    description: "The PDF is made without a watermark and saved. Every later download returns that exact file.",
  },
  signed: { label: "Mark signed", description: "Records that the client signed. You can attach the signed copy." },
  active: { label: "Mark active", description: "Records that the work under this contract has started." },
  ended: { label: "Mark ended", description: "Records that the contract has ended. No further steps after this." },
  cancelled: {
    label: "Cancel contract",
    description: "Records that the contract was cancelled. No further steps after this.",
    danger: true,
  },
};

function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className={`${sectionTitle} mb-4`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Details({ view }: { view: ContractView }) {
  const { contract } = view;
  const rows: [string, React.ReactNode][] = [
    [
      "Client",
      <Link key="client" href={`/studio/clients/${view.client.id}`} className={textLink}>
        {view.client.name}
      </Link>,
    ],
    ["Project", view.projectName ?? "—"],
    ["Status", <StatusBadge key="status" status={contract.status} />],
    ["Amount", contract.amountMinor === null ? "—" : formatAmount(contract.amountMinor, contract.currency)],
    ["Billing", contract.billingCadence ? statusLabel(contract.billingCadence) : "—"],
    ["Start date", contract.startDate ? formatPlainDate(contract.startDate) : "—"],
    ["End date", contract.endDate ? formatPlainDate(contract.endDate) : "—"],
    ["Sent", view.sentAt ? formatDate(view.sentAt) : "—"],
    ["Signed", view.signedAt ? formatDate(view.signedAt) : "—"],
  ];
  return (
    <dl className={`${card} mt-8 grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-3 p-5 text-sm`}>
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="font-semibold">{term}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
      <dt className="font-semibold">Terms summary</dt>
      <dd className="whitespace-pre-line break-words">{contract.termsSummary ?? "—"}</dd>
    </dl>
  );
}

function Steps({ view }: { view: ContractView }) {
  const { contract } = view;
  const steps = CONTRACT_TRANSITIONS[contract.status];
  if (steps.length === 0) {
    return null;
  }
  return (
    <Section id="steps-title" title="Next steps">
      <div className="flex flex-wrap items-start gap-3">
        {steps.map((to) => {
          const step = STEPS[to];
          return (
            <StepDialog
              key={to}
              action={changeContractStatusAction}
              fields={{ contractId: contract.id, to, version: view.version }}
              triggerLabel={step.label}
              title={`${step.label}?`}
              description={step.description}
              confirmLabel={step.label}
              withFile={to === "signed"}
              danger={step.danger}
            />
          );
        })}
      </div>
    </Section>
  );
}

function Files({ view, writable }: { view: ContractView; writable: boolean }) {
  const canAdd = writable && SIGNED_COPY_STATUSES.includes(view.contract.status);
  if (view.files.length === 0 && !canAdd) {
    return null;
  }
  return (
    <Section id="files-title" title="Files">
      {view.files.length === 0 ? (
        <p className={`${card} p-5 text-sm text-stone-600 dark:text-stone-300`}>No files yet.</p>
      ) : (
        <ul className="grid gap-3">
          {view.files.map((file) => {
            const label =
              file.kind === "sent_pdf"
                ? `Sent on ${formatDate(file.shownAt)}${file.replaced ? ", replaced" : ""}`
                : `Signed copy, added ${formatDate(file.shownAt)}`;
            return (
              <li key={file.id} className={`${card} flex flex-wrap items-center justify-between gap-2 p-4 text-sm`}>
                <span className="font-semibold">{label}</span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className={muted}>{fileSize(file.sizeBytes)}</span>
                  <a href={`/studio/contracts/${view.contract.id}/files/${file.id}`} className={textLink}>
                    {file.kind === "sent_pdf" ? "Open" : "Download"}
                  </a>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {canAdd && (
        <div className={`${card} mt-4 p-4`}>
          <AddSignedCopyForm action={addSignedCopyAction} contractId={view.contract.id} />
        </div>
      )}
    </Section>
  );
}

// Live invoices of this contract with the billed and paid totals (spec 0013, AC-11).
function Invoices({
  view,
  invoices,
}: {
  view: ContractView;
  invoices: Awaited<ReturnType<typeof listContractInvoices>>;
}) {
  const { contract } = view;
  const summary = [
    `Billed ${formatAmount(invoices.billedMinor, contract.currency)}`,
    `Paid ${formatAmount(invoices.paidMinor, contract.currency)}`,
    ...(contract.amountMinor === null ? [] : [`Contract amount ${formatAmount(contract.amountMinor, contract.currency)}`]),
  ];
  return (
    <section aria-labelledby="invoices-title" className="mt-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="invoices-title" className={sectionTitle}>
          Invoices
        </h2>
        {canInvoice(contract, view.client) && (
          <Link href={`/studio/contracts/${contract.id}/invoices/new`} className={secondaryButton}>
            New invoice
          </Link>
        )}
      </div>
      <p className={`mb-4 flex flex-wrap gap-x-4 text-sm tabular-nums ${muted}`}>
        {summary.map((part) => (
          <span key={part}>{part}</span>
        ))}
      </p>
      {invoices.rows.length === 0 ? (
        <p className={`${card} p-5 text-sm text-stone-600 dark:text-stone-300`}>No invoices yet.</p>
      ) : (
        <InvoiceRows rows={invoices.rows} show={{}} />
      )}
    </section>
  );
}

function History({ view }: { view: ContractView }) {
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
                </>
              ) : (
                <span className={muted}>Created as</span>
              )}
              <StatusBadge status={event.toStatus} />
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

export default async function ContractPage({ params }: { params: Promise<{ contractId: string }> }) {
  await requireStudioAccess();
  const { contractId } = await params;

  let view: ContractView;
  let invoices: Awaited<ReturnType<typeof listContractInvoices>>;
  try {
    [view, invoices] = await Promise.all([getContractView(contractId), listContractInvoices(contractId)]);
  } catch (err) {
    notFoundOr(err);
  }
  const { contract, client } = view;
  const writable = !contract.archivedAt && !client.archivedAt;
  const missing = contract.status === "draft" ? missingLabels(contract.body, view.values) : [];

  return (
    <main className="container py-12 md:py-16">
      <Link href={contract.archivedAt ? "/studio/contracts?archived=1" : "/studio/contracts"} className={`${textLink} text-sm`}>
        ← {contract.archivedAt ? "Archived contracts" : "All contracts"}
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={pageEyebrow}>Contract · {client.name}</p>
          <h1 className="mt-2 break-words text-4xl md:text-5xl">{contract.title}</h1>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {writable && contract.status === "draft" && (
            <Link href={`/studio/contracts/${contract.id}/edit`} className={primaryButton}>
              Edit contract
            </Link>
          )}
          {/* A plain link: the route streams the file, never a Blob URL (spec 0007, AC-11). */}
          <a href={`/studio/contracts/${contract.id}/pdf`} className={secondaryButton}>
            Download PDF
          </a>
          {writable && ARCHIVABLE_STATUSES.includes(contract.status) && (
            <ConfirmSubmit
              action={archiveContractAction}
              fields={{ contractId: contract.id, clientId: client.id }}
              triggerLabel="Archive contract"
              title={`Archive ${contract.title}?`}
              description="It leaves the contract lists and becomes read only. Its files stay downloadable. There is no unarchive."
              confirmLabel="Archive contract"
            />
          )}
        </div>
      </div>

      {contract.archivedAt && (
        <p className="mt-6 rounded-lg border border-stone-400 bg-stone-300 px-4 py-3 text-sm font-semibold dark:border-stone-600 dark:bg-stone-800">
          Archived on {formatDate(contract.archivedAt)}
        </p>
      )}
      {!contract.archivedAt && client.archivedAt && (
        <p className="mt-6 rounded-lg border border-stone-400 bg-stone-300 px-4 py-3 text-sm font-semibold dark:border-stone-600 dark:bg-stone-800">
          The client is archived, so this contract is read only.
        </p>
      )}

      <Details view={view} />
      {writable && <Steps view={view} />}

      <Section id="text-title" title="Contract text">
        {missing.length > 0 && (
          <p className="mb-4 rounded-lg border border-amber-600 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-100">
            Fill these before sending: {missing.join(", ")}.
          </p>
        )}
        <div className={`${card} p-5 md:p-8`}>
          <ContractBody body={contract.body} values={view.values} />
        </div>
      </Section>

      <Invoices view={view} invoices={invoices} />
      <Files view={view} writable={writable} />
      <History view={view} />
    </main>
  );
}
