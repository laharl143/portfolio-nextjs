import Link from "next/link";

// One dense line: title and detail left, age right (spec 0012, Design source). Rows without a link (the export
// differences) render as plain text.
export default function AttentionRow({
  href,
  title,
  detail,
  age,
  ageTitle,
  mark,
}: {
  href?: string;
  title: string;
  detail?: React.ReactNode;
  age?: string;
  ageTitle?: string;
  mark?: React.ReactNode;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={href ? "truncate font-semibold" : "break-words"}>{title}</span>
          {mark}
        </span>
        {detail && <span className="mt-0.5 block truncate text-stone-600 dark:text-stone-400">{detail}</span>}
      </span>
      {age && (
        <span title={ageTitle} className="shrink-0 tabular-nums text-stone-500">
          {age}
        </span>
      )}
    </>
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-orange-500 dark:hover:bg-stone-700"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-5 py-3 text-sm">{body}</div>
      )}
    </li>
  );
}
