"use client";

import { reloadPage } from "./_components/reload-page";
import { card, primaryButton } from "./_components/ui";

// Studio outage screen (spec 0012, AC-10 first case). It sits above (signed-in)/layout.tsx so it
// catches a failed session lookup in the guard. Fixed text only: never error.message or digest,
// no owner detail, no state name. Try again reloads the document, never reset().
export default function StudioError({}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container py-12 md:py-16">
      <div role="alert" className={`${card} flex max-w-xl flex-col items-start gap-4 p-6`}>
        <h1 className="text-2xl font-semibold">Studio is unavailable</h1>
        <p className="text-sm text-stone-600 dark:text-stone-300">
          The studio could not reach its database. Nothing was changed. Try again in a moment.
        </p>
        <button type="button" onClick={reloadPage} className={primaryButton}>
          Try again
        </button>
      </div>
    </main>
  );
}
