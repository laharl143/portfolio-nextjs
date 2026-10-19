import { getRecordCounts, type RecordCounts } from "@/studio/data/counts";
import { getDatabaseStatus, type DatabaseStatus } from "@/studio/db/status";
import { requireStudioAccess } from "@/studio/guard";
import { isStoreReachable } from "@/studio/storage/blob";

function databaseLine(status: DatabaseStatus) {
  switch (status.state) {
    case "not-connected":
      return "Not connected";
    case "not-migrated":
      return "Connected, not migrated";
    case "migrated":
      return `Connected, ${status.count} migrations applied`;
  }
}

// Labels and order are fixed by spec 0004 (Value sourcing).
const COUNT_ROWS: { key: keyof RecordCounts; label: string }[] = [
  { key: "clients", label: "Clients" },
  { key: "contacts", label: "Contacts" },
  { key: "projects", label: "Projects" },
  { key: "contracts", label: "Contracts" },
  { key: "notes", label: "Notes" },
  { key: "systems", label: "Systems" },
  { key: "systemLinks", label: "System links" },
];

// Counts show only on a migrated database, and stay hidden if the query fails (spec 0004, AC-8).
async function loadCounts(database: DatabaseStatus): Promise<RecordCounts | null> {
  if (database.state !== "migrated") {
    return null;
  }
  try {
    return await getRecordCounts();
  } catch {
    return null;
  }
}

export default async function StudioPage() {
  await requireStudioAccess();

  const [database, storeReachable] = await Promise.all([getDatabaseStatus(), isStoreReachable()]);
  const counts = await loadCounts(database);

  return (
    <main className="container py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-stone-500">Private</p>
      <h1 className="mt-2 text-5xl md:text-6xl">Studio</h1>

      <dl className="mt-10 max-w-md divide-y divide-stone-300 rounded-xl border border-stone-300 bg-stone-100 text-sm dark:divide-stone-700 dark:border-stone-700 dark:bg-stone-800">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <dt className="font-semibold">Database</dt>
          <dd>{databaseLine(database)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <dt className="font-semibold">File storage</dt>
          <dd>{storeReachable ? "Private store reachable" : "Storage not reachable"}</dd>
        </div>
        {counts &&
          COUNT_ROWS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="font-semibold">{label}</dt>
              <dd className="tabular-nums">{counts[key]}</dd>
            </div>
          ))}
      </dl>
    </main>
  );
}
