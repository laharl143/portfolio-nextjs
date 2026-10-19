// The skeleton for every client tracking page (spec 0006, AC-10).
export default function ClientsLoading() {
  return (
    <main className="container py-12 md:py-16" aria-busy="true">
      <p className="sr-only" role="status">
        Loading
      </p>
      <div className="animate-pulse space-y-6" aria-hidden="true">
        <div className="h-4 w-24 rounded bg-stone-300 dark:bg-stone-700" />
        <div className="h-10 w-64 max-w-full rounded bg-stone-300 dark:bg-stone-700" />
        <div className="h-11 w-full max-w-xl rounded-lg bg-stone-300 dark:bg-stone-700" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-14 w-full rounded-xl bg-stone-300 dark:bg-stone-700" />
          ))}
        </div>
      </div>
    </main>
  );
}
