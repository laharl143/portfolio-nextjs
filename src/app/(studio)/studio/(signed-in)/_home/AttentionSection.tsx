import Link from "next/link";
import { card, textLink } from "../../_components/ui";

export type SectionLink = { href: string; label: string };

// One signal's oldest items, or `Could not load` when its read failed (spec 0012, AC-3 to AC-6, AC-11).
export default function AttentionSection({
  id,
  title,
  failed,
  links,
  children,
}: {
  id: string;
  title: string;
  failed: boolean;
  links: SectionLink[];
  children?: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${card} scroll-mt-6`}>
      <h2 id={`${id}-title`} className="px-5 pt-4 text-lg font-semibold">
        {title}
      </h2>
      {failed ? (
        <p className="px-5 py-4 text-sm text-red-700 dark:text-red-400">Could not load</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-stone-300 border-y border-stone-300 dark:divide-stone-700 dark:border-stone-700">
            {children}
          </ul>
          {links.length > 0 && (
            <div className="flex flex-wrap gap-4 px-5 py-3 text-sm">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className={textLink}>
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
