import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  INVOICE_FILTERS,
  invoiceListHref,
  parseInvoiceListParams,
  type RawSearchParams,
} from "@/studio/clients/list-params";
import { listInvoices } from "@/studio/data/invoices";
import { statusLabel } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import InvoiceRows from "../../_components/InvoiceRows";
import Paging from "../../_components/Paging";
import { card, input, label, pageEyebrow, secondaryButton, textLink } from "../../_components/ui";
import ListLoading from "./_components/ListLoading";

export const metadata: Metadata = {
  title: "Invoices · Studio",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<RawSearchParams> };

function emptyTitle(total: number, filtered: boolean, archived: boolean): string {
  if (total > 0) {
    return "No invoices on this page";
  }
  if (filtered) {
    return "No invoices match";
  }
  return archived ? "No discarded drafts" : "No invoices yet";
}

async function InvoiceList({ searchParams }: Props) {
  await requireStudioAccess();
  const filters = parseInvoiceListParams(await searchParams);
  const list = await listInvoices(filters);
  const filtered = Boolean(filters.status);

  return (
    <main className="container py-12 md:py-16">
      <p className={pageEyebrow}>{filters.archived ? "Discarded" : "Private"}</p>
      <h1 className="mt-2 text-4xl md:text-5xl">{filters.archived ? "Discarded drafts" : "Invoices"}</h1>
      <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
        New invoices start from an active or ended contract.{" "}
        <Link href="/studio/invoices/profile" className={textLink}>
          Billing profile
        </Link>
      </p>

      {/* GET form: changing the status keeps the archived toggle and drops `page`. */}
      <form action="/studio/invoices" method="get" className="mt-8 flex flex-wrap items-end gap-4">
        {filters.archived && <input type="hidden" name="archived" value="1" />}
        <div className="w-full md:w-48">
          <label htmlFor="status" className={label}>
            Status
          </label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className={input}>
            <option value="">All statuses</option>
            {INVOICE_FILTERS.map((status) => (
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
          href={invoiceListHref({ status: filters.status, archived: !filters.archived })}
          className={`${textLink} text-sm md:ml-auto`}
        >
          {filters.archived ? "Show current invoices" : "Show discarded drafts"}
        </Link>
      </form>

      {list.rows.length === 0 ? (
        <div className={`${card} mt-8 flex flex-col items-start gap-4 p-6`}>
          <p className="text-lg font-semibold">{emptyTitle(list.total, filtered, filters.archived)}</p>
          {list.total > 0 ? (
            <Link href={invoiceListHref({ ...filters, page: 1 })} className={textLink}>
              Go to page 1
            </Link>
          ) : filtered ? (
            <Link href={invoiceListHref({ archived: filters.archived })} className={textLink}>
              Clear the filter
            </Link>
          ) : (
            <Link href="/studio/contracts" className={textLink}>
              Go to contracts
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 mt-6 text-sm text-stone-600 dark:text-stone-300" aria-live="polite">
            {list.total === 1 ? "1 invoice" : `${list.total} invoices`}
          </p>
          <InvoiceRows rows={list.rows} show={{ client: true, contract: true }} />
          <Paging
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            hrefFor={(page) => invoiceListHref({ ...filters, page })}
          />
        </>
      )}
    </main>
  );
}

// Every invoice of your workspace (spec 0013, AC-11). Only this list streams behind a loading state.
export default async function InvoicesPage(props: Props) {
  await requireStudioAccess();
  return (
    <Suspense fallback={<ListLoading />}>
      <InvoiceList {...props} />
    </Suspense>
  );
}
