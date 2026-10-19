import type { Metadata } from "next";
import Link from "next/link";
import { parsePage, type RawSearchParams } from "@/studio/clients/list-params";
import { listTemplates } from "@/studio/data/contract-templates";
import { formatDate } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import Paging from "../../_components/Paging";
import { card, pageEyebrow, primaryButton, textLink } from "../../_components/ui";

export const metadata: Metadata = {
  title: "Templates · Studio",
  robots: { index: false, follow: false },
};

function pageHref(page: number): string {
  return page > 1 ? `/studio/templates?page=${page}` : "/studio/templates";
}

// Live contract templates, newest update first, 25 per page (spec 0007, AC-1).
export default async function TemplatesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireStudioAccess();
  const page = parsePage(await searchParams);
  const list = await listTemplates(page);

  return (
    <main className="container py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={pageEyebrow}>Private</p>
          <h1 className="mt-2 text-4xl md:text-5xl">Templates</h1>
        </div>
        <Link href="/studio/templates/new" className={primaryButton}>
          New template
        </Link>
      </div>

      {list.rows.length === 0 ? (
        <div className={`${card} mt-8 flex flex-col items-start gap-4 p-6`}>
          <p className="text-lg font-semibold">{list.total === 0 ? "No templates yet" : "No templates on this page"}</p>
          {list.total === 0 ? (
            <Link href="/studio/templates/new" className={primaryButton}>
              New template
            </Link>
          ) : (
            <Link href={pageHref(1)} className={textLink}>
              Go to page 1
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-3">
            {list.rows.map((template) => (
              <li key={template.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link href={`/studio/templates/${template.id}/edit`} className={`${textLink} break-words`}>
                    {template.name}
                  </Link>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    Updated {formatDate(template.updatedAt)}
                  </span>
                </div>
                {template.description && (
                  <p className="mt-2 whitespace-pre-line break-words text-sm text-stone-600 dark:text-stone-300">
                    {template.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <Paging page={list.page} pageSize={list.pageSize} total={list.total} hrefFor={pageHref} />
        </>
      )}
    </main>
  );
}
