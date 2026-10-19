import type { Metadata } from "next";
import Link from "next/link";
import { SYSTEM_LAYER_LABELS } from "@/studio/db/constants";
import { listSystemBoard, type SystemCard } from "@/studio/data/systems";
import { requireStudioAccess } from "@/studio/guard";
import { productLinks, products, statusSections } from "@/studio/systems/bundled";
import { diffPublic } from "@/studio/systems/drift";
import { getPublicProjection } from "@/studio/systems/projection";
import { card, pageEyebrow, primaryButton, secondaryButton, textLink } from "../../_components/ui";

export const metadata: Metadata = {
  title: "Systems · Studio",
  robots: { index: false, follow: false },
};

const muted = "text-stone-500 dark:text-stone-400";

function Card({ system }: { system: SystemCard }) {
  return (
    <li className={`${card} p-4`}>
      <Link href={`/studio/systems/${system.id}`} className={`${textLink} break-words`}>
        {system.name}
      </Link>
      <p className={`mt-1 text-sm ${muted}`}>{SYSTEM_LAYER_LABELS[system.layer]}</p>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="tabular-nums">{system.linkCount === 1 ? "1 link" : `${system.linkCount} links`}</span>
        {!system.published && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Not published
          </span>
        )}
      </p>
    </li>
  );
}

// Four columns in the public section order (AC-1); one column at 375px (AC-12).
function Board({ cards }: { cards: SystemCard[] }) {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {statusSections.map((section) => {
        const column = cards.filter((system) => system.status === section.status);
        const id = `column-${section.status}`;
        return (
          <section key={section.status} aria-labelledby={id}>
            <h2 id={id} className="mb-3 flex items-baseline justify-between gap-2 text-lg font-semibold">
              {section.title}
              <span className={`text-sm font-normal tabular-nums ${muted}`}>{column.length}</span>
            </h2>
            {column.length === 0 ? (
              <p className={`text-sm ${muted}`}>None</p>
            ) : (
              <ul className="grid gap-3">
                {column.map((system) => (
                  <Card key={system.id} system={system} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// Compares the database with the public file built into this deploy (AC-9). The export link is a plain <a download>,
// never next/link, so nothing prefetches it (AC-10).
async function SyncBanner() {
  const projection = await getPublicProjection();
  const differences = diffPublic(projection, { products, productLinks });
  const exportable = projection.systems.length > 0;

  if (differences.length === 0) {
    return (
      <p role="status" className={`${card} mt-8 px-4 py-3 text-sm font-semibold`}>
        Public page matches the studio
      </p>
    );
  }
  return (
    <section
      aria-labelledby="sync-title"
      className="mt-8 rounded-xl border border-amber-500 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100"
    >
      <h2 id="sync-title" className="font-semibold">
        Public page is out of date: {differences.length} {differences.length === 1 ? "difference" : "differences"}
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {differences.map((difference) => (
          <li key={difference} className="break-words">
            {difference}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {exportable ? (
          <a href="/studio/systems/export" download="products-data.ts" className={primaryButton}>
            Export public file
          </a>
        ) : (
          <>
            <button type="button" disabled className={primaryButton}>
              Export public file
            </button>
            <span>Publish at least one live system before you export.</span>
          </>
        )}
        <span className="text-xs">Replace utils/data/products-data.ts with it, read the diff, commit, and deploy.</span>
      </div>
    </section>
  );
}

export default async function SystemsPage({ searchParams }: { searchParams: Promise<{ archived?: string | string[] }> }) {
  await requireStudioAccess();
  const archived = (await searchParams).archived === "1";
  const board = await listSystemBoard({ archived });

  return (
    <main className="container py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={pageEyebrow}>{archived ? "Archived" : "Private"}</p>
          <h1 className="mt-2 text-4xl md:text-5xl">{archived ? "Archived systems" : "Systems"}</h1>
        </div>
        {!archived && (
          <div className="flex flex-wrap gap-3">
            <Link href="/studio/systems/import" className={secondaryButton}>
              Import
            </Link>
            <Link href="/studio/systems/new" className={primaryButton}>
              New system
            </Link>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm">
        <Link href={archived ? "/studio/systems" : "/studio/systems?archived=1"} className={textLink}>
          {archived ? "Show live systems" : "Archived"}
        </Link>
      </p>

      {!archived && <SyncBanner />}

      {board.total === 0 ? (
        <div className={`${card} mt-8 flex flex-col items-start gap-4 p-6`}>
          <p className="text-lg font-semibold">No systems yet</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/studio/systems/import" className={textLink}>
              Import
            </Link>
            <Link href="/studio/systems/new" className={textLink}>
              New system
            </Link>
          </div>
        </div>
      ) : archived && board.cards.length === 0 ? (
        <div className={`${card} mt-8 flex flex-col items-start gap-4 p-6`}>
          <p className="text-lg font-semibold">No archived systems</p>
          <Link href="/studio/systems" className={textLink}>
            Back to live systems
          </Link>
        </div>
      ) : (
        <Board cards={board.cards} />
      )}
    </main>
  );
}
