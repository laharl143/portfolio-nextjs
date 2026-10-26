import Link from "next/link";
import type { InvoiceRow } from "@/studio/data/invoices";
import { formatAmount, formatDate, formatPlainDate } from "@/studio/format";
import StatusBadge from "./StatusBadge";
import { card, textLink } from "./ui";

// An invoice's status as shown everywhere (spec 0013, AC-4 and AC-9): a sent invoice past its due date reads Overdue.
export function InvoiceStatus({ status, overdue }: { status: string; overdue: boolean }) {
  return <StatusBadge status={overdue ? "overdue" : status} />;
}

// Invoice rows for the list, the contract page, and the client page (spec 0013, AC-11).
export default function InvoiceRows({
  rows,
  show,
}: {
  rows: InvoiceRow[];
  show: { client?: boolean; contract?: boolean };
}) {
  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.id} className={`${card} p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/studio/invoices/${row.id}`} className={`${textLink} break-words`}>
                {row.number ?? "Draft"}
              </Link>
              {(show.client || show.contract) && (
                <p className="mt-1 break-words text-sm text-stone-600 dark:text-stone-300">
                  {[show.client ? row.clientName : null, show.contract ? row.contractTitle : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <InvoiceStatus status={row.status} overdue={row.overdue} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
            <span className="tabular-nums">{formatAmount(row.totalMinor, row.currency)}</span>
            <span>{row.dueOn ? `Due ${formatPlainDate(row.dueOn)}` : "Due date set when sent"}</span>
            <span>{row.archivedAt ? `Discarded ${formatDate(row.archivedAt)}` : `Last change ${formatDate(row.updatedAt)}`}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
