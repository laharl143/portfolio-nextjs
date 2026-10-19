import type { Metadata } from "next";
import Link from "next/link";
import { contractListHref, parseContractListParams, type RawSearchParams } from "@/studio/clients/list-params";
import { CONTRACT_STATUSES } from "@/studio/db/constants";
import { listContracts, type ContractList } from "@/studio/data/contracts";
import { formatAmount, formatDate, statusLabel } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import Paging from "../../_components/Paging";
import StatusBadge from "../../_components/StatusBadge";
import { card, input, label, pageEyebrow, secondaryButton, textLink } from "../../_components/ui";

export const metadata: Metadata = {
  title: "Contracts · Studio",
  robots: { index: false, follow: false },
};

function Results({ list }: { list: ContractList }) {
  return (
    <ul className="mt-6 grid gap-3">
      {list.rows.map((row) => (
        <li key={row.id} className={`${card} p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/studio/contracts/${row.id}`} className={`${textLink} break-words`}>
                {row.title}
              </Link>
              <p className="mt-1 break-words text-sm text-stone-600 dark:text-stone-300">{row.clientName}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
            <span className="tabular-nums">
              {row.amountMinor === null ? "No amount" : formatAmount(row.amountMinor, row.currency)}
            </span>
            <span>Last change {formatDate(row.lastChangeAt)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function emptyTitle(total: number, filtered: boolean, archived: boolean): string {
  if (total > 0) {
    return "No contracts on this page";
  }
  if (filtered) {
    return "No contracts match";
  }
  return archived ? "No archived contracts" : "No contracts yet";
}

// Every contract of your workspace (spec 0007, AC-9): live, or archived only with `?archived=1`.
export default async function ContractsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireStudioAccess();
  const filters = parseContractListParams(await searchParams);
  const list = await listContracts(filters);
  const filtered = Boolean(filters.status);

  return (
    <main className="container py-12 md:py-16">
      <p className={pageEyebrow}>{filters.archived ? "Archived" : "Private"}</p>
      <h1 className="mt-2 text-4xl md:text-5xl">{filters.archived ? "Archived contracts" : "Contracts"}</h1>
      <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">New contracts start from a client page.</p>

      {/* GET form: changing the status keeps the archived toggle and drops `page`. */}
      <form action="/studio/contracts" method="get" className="mt-8 flex flex-wrap items-end gap-4">
        {filters.archived && <input type="hidden" name="archived" value="1" />}
        <div className="w-full md:w-48">
          <label htmlFor="status" className={label}>
            Status
          </label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className={input}>
            <option value="">All statuses</option>
            {CONTRACT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={secondaryButton}>
          Filter
        </button>
        <Link
          href={contractListHref({ status: filters.status, archived: !filters.archived })}
          className={`${textLink} text-sm md:ml-auto`}
        >
          {filters.archived ? "Show current contracts" : "Show archived contracts"}
        </Link>
      </form>

      {list.rows.length === 0 ? (
        <div className={`${card} mt-8 flex flex-col items-start gap-4 p-6`}>
          <p className="text-lg font-semibold">{emptyTitle(list.total, filtered, filters.archived)}</p>
          {list.total > 0 ? (
            <Link href={contractListHref({ ...filters, page: 1 })} className={textLink}>
              Go to page 1
            </Link>
          ) : filtered ? (
            <Link href={contractListHref({ archived: filters.archived })} className={textLink}>
              Clear the filter
            </Link>
          ) : (
            <Link href="/studio/clients" className={textLink}>
              Go to clients
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-stone-600 dark:text-stone-300" aria-live="polite">
            {list.total === 1 ? "1 contract" : `${list.total} contracts`}
          </p>
          <Results list={list} />
          <Paging
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            hrefFor={(page) => contractListHref({ ...filters, page })}
          />
        </>
      )}
    </main>
  );
}
