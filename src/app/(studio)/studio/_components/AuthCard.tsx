import Link from "next/link";

// The login and setup card, after the vital-stats admin card (spec 0005, UX surface): a deep card with two chips,
// a name line, an uppercase headline, and a folded corner back to the public site.
export default function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-200 px-4 py-12 dark:bg-stone-950">
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          aria-label="Back to website"
          className="group absolute left-0 top-0 z-10 flex size-14 items-start justify-start rounded-tl-2xl focus-visible:outline-none"
        >
          {/* The fold: a triangle cut from the card's corner. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-tl-2xl bg-stone-700 transition-transform duration-200 [clip-path:polygon(0_0,100%_0,0_100%)] group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-red-orange-500 dark:bg-stone-600"
          />
          <span aria-hidden="true" className="relative ml-2 mt-1.5 text-sm text-stone-100">
            ←
          </span>
          <span className="pointer-events-none absolute -top-8 left-0 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-xs text-stone-100 opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-stone-700">
            Back to website
          </span>
        </Link>

        <section className="overflow-hidden rounded-2xl bg-stone-900 px-6 pb-10 pt-12 text-center text-stone-100 shadow-2xl ring-1 ring-stone-800 sm:px-10 dark:bg-stone-900 dark:ring-stone-700">
          <div className="flex justify-center gap-2">
            <span className="rounded-full bg-red-orange-500 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-stone-950">
              Secure
            </span>
            <span className="rounded-full border border-stone-500 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-stone-300">
              Studio Access
            </span>
          </div>

          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-stone-400">Erskine Duenas</p>
          <h1 className="mt-3 text-3xl font-bold uppercase tracking-tight">{title}</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-stone-400">{description}</p>

          <div className="mt-8">{children}</div>
        </section>
      </div>

      <p className="text-xs uppercase tracking-widest text-stone-500">Private studio · not indexed</p>
    </main>
  );
}
