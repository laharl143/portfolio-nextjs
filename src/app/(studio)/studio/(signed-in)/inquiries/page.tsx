import Link from "next/link";
import { cookies } from "next/headers";
import { requireStudioAccess } from "@/studio/guard";
import { listInquiries } from "@/studio/data/inquiries";
import { INQUIRY_SEARCH_COOKIE } from "@/studio/auth/cookie";
import { searchInquiriesAction } from "@/studio/inquiries/actions";
import { formatDateTime } from "@/studio/format";
import { card, input, primaryButton, textLink } from "../../_components/ui";
export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireStudioAccess();
  // AC-10: the search term comes from the cookie the search action sets, never from the URL.
  const { status, alert, page } = await searchParams;
  const q = (await cookies()).get(INQUIRY_SEARCH_COOKIE)?.value;
  const result = await listInquiries({ q, status, alert, page });
  const href = (page: number) =>
    `/studio/inquiries?${new URLSearchParams({ status: result.status, alert: result.alert, page: String(page) })}`;
  return (
    <main className="container space-y-6 py-10">
      <h1 className="text-3xl font-semibold">Inquiries</h1>
      {result.health?.overdue && (
        <p role="alert" className="rounded-lg border border-red-500 p-4">
          Inquiry cleanup has not completed in 48 hours. Check the scheduled
          job. Last outcome: {result.health.outcome}.
        </p>
      )}
      <form action={searchInquiriesAction} className="grid gap-4 md:grid-cols-4">
        <label>
          Search name, email, company
          <input
            className={input}
            name="q"
            maxLength={100}
            defaultValue={result.q}
          />
        </label>
        <label>
          Status
          <select className={input} name="status" defaultValue={result.status}>
            <option value="">All statuses</option>
            {["new", "reviewing", "converted", "closed"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Alerts
          <select className={input} name="alert" defaultValue={result.alert}>
            <option value="">All alerts</option>
            <option value="attention">Needs attention</option>
            <option value="accepted">Accepted</option>
          </select>
        </label>
        <button className={`${primaryButton} self-end`}>Filter</button>
      </form>
      <p>{result.total} inquiries</p>
      {result.items.length === 0 ? (
        <p className={`${card} p-6`}>
          {result.page > 1
            ? "This page has no inquiries. Return to the first page."
            : result.q || result.status || result.alert
              ? "No inquiries match these filters."
              : "Your inquiry inbox is empty."}{" "}
          <Link className={textLink} href="/studio/inquiries">
            First page
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {result.items.map((i) => (
            <li key={i.id} className={`${card} p-5`}>
              <Link href={`/studio/inquiries/${i.id}`} className={textLink}>
                {i.name}
              </Link>
              <p className="break-all">
                {i.email}
                {i.company ? ` · ${i.company}` : ""}
              </p>
              <p className="mt-2 text-sm">
                {i.status} · Alert: {i.alert_state} ·{" "}
                {formatDateTime(new Date(i.created_at))}
              </p>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Inquiry pages" className="flex gap-6">
        {result.page > 1 && (
          <Link className={textLink} href={href(result.page - 1)}>
            Previous
          </Link>
        )}
        {result.page * 50 < result.total && (
          <Link className={textLink} href={href(result.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </main>
  );
}
