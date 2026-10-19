"use client";

import Link from "next/link";
import { card, primaryButton, textLink } from "../../_components/ui";

// A failed read (spec 0006, AC-10). Fixed text only: never error.message, never action state.
export default function ClientsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container py-12 md:py-16">
      <div role="alert" className={`${card} flex max-w-xl flex-col items-start gap-4 p-6`}>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-stone-600 dark:text-stone-300">This page could not be loaded. Try again in a moment.</p>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={reset} className={primaryButton}>
            Try again
          </button>
          <Link href="/studio/clients" className={textLink}>
            Back to clients
          </Link>
        </div>
      </div>
    </main>
  );
}
