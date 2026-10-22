import Link from "next/link";
import { statusLabel } from "@/studio/format";

const SEGMENT: Record<string, string> = {
  lead: "bg-sky-500",
  planned: "bg-sky-500",
  sent: "bg-sky-500",
  active: "bg-emerald-500",
  draft: "bg-amber-500",
  on_hold: "bg-amber-500",
  signed: "bg-violet-500",
  past: "bg-stone-400",
  ended: "bg-stone-400",
  done: "bg-stone-400",
  cancelled: "bg-stone-600 dark:bg-stone-500",
};

const legendLink =
  "inline-flex items-center gap-1.5 rounded hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500";

// A stacked bar with a text legend, so no number depends on colour alone (spec 0012, AC-8, WCAG 1.4.1). The bar
// segments are mouse shortcuts only; the legend carries the accessible links.
export default function StatusBar({
  title,
  noun,
  statuses,
  counts,
  hrefFor,
}: {
  title: string;
  noun: string;
  statuses: readonly string[];
  counts: Record<string, number>;
  hrefFor?: (status: string) => string;
}) {
  const total = statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);

  return (
    <div>
      <h3 className="text-sm font-semibold">
        {title} <span className="font-normal tabular-nums text-stone-500">{total}</span>
      </h3>
      {total === 0 ? (
        <p className="mt-2 text-sm text-stone-500">No {noun} yet</p>
      ) : (
        <>
          <div aria-hidden="true" className="mt-2 flex h-3 overflow-hidden rounded-full bg-stone-300 dark:bg-stone-700">
            {statuses
              .filter((status) => (counts[status] ?? 0) > 0)
              .map((status) => {
                const style = { width: `${((counts[status] ?? 0) / total) * 100}%` };
                const tone = `${SEGMENT[status] ?? "bg-stone-400"} h-full`;
                return hrefFor ? (
                  <Link key={status} href={hrefFor(status)} tabIndex={-1} className={`${tone} hover:opacity-80`} style={style} />
                ) : (
                  <span key={status} className={tone} style={style} />
                );
              })}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {statuses.map((status) => {
              const entry = (
                <>
                  <span aria-hidden="true" className={`inline-block size-2.5 rounded-full ${SEGMENT[status] ?? "bg-stone-400"}`} />
                  {statusLabel(status)} <span className="tabular-nums">{counts[status] ?? 0}</span>
                </>
              );
              return (
                <li key={status} className="inline-flex items-center gap-1.5">
                  {hrefFor ? (
                    <Link href={hrefFor(status)} className={legendLink}>
                      {entry}
                    </Link>
                  ) : (
                    entry
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
