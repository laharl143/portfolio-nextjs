"use client";

import Link from "next/link";
import { reloadPage } from "../../_components/reload-page";
import { card, primaryButton, textLink } from "../../_components/ui";

// A failed read (spec 0013, AC-15). Fixed text only: never error.message, never action state. Retry reloads the
// document so it does not reuse a failed server response.
export default function InvoicesError() {
  return (
    <main className="container py-12 md:py-16">
      <div role="alert" className={`${card} flex max-w-xl flex-col items-start gap-4 p-6`}>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-stone-600 dark:text-stone-300">This page could not be loaded. Try again in a moment.</p>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={reloadPage} className={primaryButton}>
            Try again
          </button>
          <Link href="/studio/invoices" className={textLink}>
            Back to invoices
          </Link>
        </div>
      </div>
    </main>
  );
}
