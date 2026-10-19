import type { Metadata } from "next";
import Link from "next/link";
import { CLIENT_STATUSES } from "@/studio/db/constants";
import { clientListHref, parseClientListParams, type RawSearchParams } from "@/studio/clients/list-params";
import { listClients, type ClientList } from "@/studio/data/clients";
import { formatDate, statusLabel } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import StatusBadge from "../../_components/StatusBadge";
import { card, input, label, pageEyebrow, primaryButton, secondaryButton, textLink } from "../../_components/ui";

export const metadata: Metadata = {
  title: "Clients · Studio",
  robots: { index: false, follow: false },
};

type Filters = ReturnType<typeof parseClientListParams>;

// Which empty message shows (spec 0006, List states), in this order of checks.
function EmptyState({ filters, list }: { filters: Filters; list: ClientList }) {
  const filtered = Boolean(filters.q || filters.status);
  let title: string;
  let action: React.ReactNode;
  if (!filters.archived && !filtered && list.total === 0) {
    title = "No clients yet";
    action = (
      <Link href="/studio/clients/new" className={primaryButton}>
        Add client
      </Link>
    );
  } else if (filters.archived && !filtered && list.total === 0) {
    title = "No archived clients";
    action = (
      <Link href="/studio/clients" className={textLink}>
        Back to current clients
      </Link>
    );
  } else if (list.total === 0) {
    title = "No clients match";
    action = (
      <Link href={clientListHref({ archived: filters.archived })} className={textLink}>
        Clear search and filter
      </Link>
    );
  } else {
    title = "No clients on this page";
    action = (
      <Link href={clientListHref({ ...filters, page: 1 })} className={textLink}>
        Go to page 1
      </Link>
    );
  }
  return (
    <div className={`${card} mt-8 flex flex-col items-start gap-4 p-6`}>
      <p className="text-lg font-semibold">{title}</p>
      {action}
    </div>
  );
}

function Results({ list }: { list: ClientList }) {
  return (
    <>
      {/* Stacked cards on narrow screens, a table from md up (spec 0006, AC-12). */}
      <ul className="mt-8 grid gap-3 md:hidden">
        {list.rows.map((row) => (
          <li key={row.id} className={`${card} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <Link href={`/studio/clients/${row.id}`} className={`${textLink} break-words`}>
                {row.name}
              </Link>
              <StatusBadge status={row.status} />
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-stone-500 dark:text-stone-400">Industry</dt>
              <dd className="break-words">{row.industry ?? "—"}</dd>
              <dt className="text-stone-500 dark:text-stone-400">Primary</dt>
              <dd className="break-words">{row.primaryContactName ?? "—"}</dd>
              <dt className="text-stone-500 dark:text-stone-400">Last activity</dt>
              <dd>{formatDate(row.lastActivityAt)}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className={`${card} mt-8 hidden overflow-hidden md:block`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-300 text-xs uppercase tracking-wider text-stone-500 dark:border-stone-700 dark:text-stone-400">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Name
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Industry
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Primary contact
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Last activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-300 dark:divide-stone-700">
            {list.rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <Link href={`/studio/clients/${row.id}`} className={`${textLink} break-words`}>
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">{row.industry ?? "—"}</td>
                <td className="px-4 py-3">{row.primaryContactName ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatDate(row.lastActivityAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Paging({ filters, list }: { filters: Filters; list: ClientList }) {
  const hasPrevious = list.page > 1;
  const hasNext = list.page * list.pageSize < list.total;
  if (!hasPrevious && !hasNext) {
    return null;
  }
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  return (
    <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center gap-3 text-sm">
      {hasPrevious && (
        <Link href={clientListHref({ ...filters, page: list.page - 1 })} className={secondaryButton}>
          Previous
        </Link>
      )}
      <span className="text-stone-600 dark:text-stone-300">
        Page {list.page} of {pages}
      </span>
      {hasNext && (
        <Link href={clientListHref({ ...filters, page: list.page + 1 })} className={secondaryButton}>
          Next
        </Link>
      )}
    </nav>
  );
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireStudioAccess();
  const filters = parseClientListParams(await searchParams);
  const list = await listClients({
    q: filters.q || undefined,
    status: filters.status ?? undefined,
    archived: filters.archived,
    page: filters.page,
  });

  return (
    <main className="container py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={pageEyebrow}>{filters.archived ? "Archived" : "Private"}</p>
          <h1 className="mt-2 text-4xl md:text-5xl">{filters.archived ? "Archived clients" : "Clients"}</h1>
        </div>
        {!filters.archived && (
          <Link href="/studio/clients/new" className={primaryButton}>
            Add client
          </Link>
        )}
      </div>

      {/* GET form: every control keeps the other filters and drops `page`. */}
      <form action="/studio/clients" method="get" role="search" className="mt-8 flex flex-wrap items-end gap-4">
        {filters.archived && <input type="hidden" name="archived" value="1" />}
        <div className="w-full md:w-72">
          <label htmlFor="q" className={label}>
            Search by name
          </label>
          <input id="q" name="q" type="search" defaultValue={filters.q} maxLength={100} className={input} />
        </div>
        <div className="w-full md:w-48">
          <label htmlFor="status" className={label}>
            Status
          </label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className={input}>
            <option value="">All statuses</option>
            {CLIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={secondaryButton}>
          Search
        </button>
        <Link
          href={clientListHref({ q: filters.q, status: filters.status, archived: !filters.archived })}
          className={`${textLink} text-sm md:ml-auto`}
        >
          {filters.archived ? "Show current clients" : "Show archived clients"}
        </Link>
      </form>

      {list.rows.length === 0 ? (
        <EmptyState filters={filters} list={list} />
      ) : (
        <>
          <p className="mt-6 text-sm text-stone-600 dark:text-stone-300" aria-live="polite">
            {list.total === 1 ? "1 client" : `${list.total} clients`}
          </p>
          <Results list={list} />
          <Paging filters={filters} list={list} />
        </>
      )}
    </main>
  );
}
