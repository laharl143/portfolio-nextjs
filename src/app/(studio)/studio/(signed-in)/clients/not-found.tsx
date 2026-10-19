import Link from "next/link";
import { card, textLink } from "../../_components/ui";

// Unknown, malformed, foreign, or archived ids (spec 0006, AC-10), inside the signed in layout.
export default function ClientNotFoundPage() {
  return (
    <main className="container py-12 md:py-16">
      <div className={`${card} flex max-w-xl flex-col items-start gap-4 p-6`}>
        <h1 className="text-2xl font-semibold">Not found</h1>
        <p className="text-sm text-stone-600 dark:text-stone-300">This record does not exist or was archived.</p>
        <Link href="/studio/clients" className={textLink}>
          Back to clients
        </Link>
      </div>
    </main>
  );
}
