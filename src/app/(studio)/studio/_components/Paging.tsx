import Link from "next/link";
import { secondaryButton } from "./ui";

// Previous and next links for a paged studio list (specs 0006 and 0007).
export default function Paging({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const hasPrevious = page > 1;
  const hasNext = page * pageSize < total;
  if (!hasPrevious && !hasNext) {
    return null;
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center gap-3 text-sm">
      {hasPrevious && (
        <Link href={hrefFor(page - 1)} className={secondaryButton}>
          Previous
        </Link>
      )}
      <span className="text-stone-600 dark:text-stone-300">
        Page {page} of {pages}
      </span>
      {hasNext && (
        <Link href={hrefFor(page + 1)} className={secondaryButton}>
          Next
        </Link>
      )}
    </nav>
  );
}
