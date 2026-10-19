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

export default async function StudioPage() {
  await requireStudioAccess();

  const [database, storeReachable] = await Promise.all([getDatabaseStatus(), isStoreReachable()]);

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
      </dl>
    </main>
  );
}
