// The invoice list's streaming fallback (spec 0013, AC-15). Only the list streams: a route wide loading.tsx would
// commit a 200 before a record lookup could return its 404.
export default function ListLoading() {
  return (
    <main className="container py-12 md:py-16" aria-busy="true">
      <p className="sr-only" role="status">
        Loading invoices
      </p>
      <div className="animate-pulse space-y-6" aria-hidden="true">
        <div className="h-4 w-24 rounded bg-stone-300 dark:bg-stone-700" />
        <div className="h-10 w-64 max-w-full rounded bg-stone-300 dark:bg-stone-700" />
        <div className="h-11 w-full max-w-xl rounded-lg bg-stone-300 dark:bg-stone-700" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-16 w-full rounded-xl bg-stone-300 dark:bg-stone-700" />
          ))}
        </div>
      </div>
    </main>
  );
}
