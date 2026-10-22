import { card } from "../../_components/ui";

// Shown in place of the strip and lists only when every signal loaded and all are 0 (spec 0012, AC-7).
export default function AllClear() {
  return (
    <section aria-labelledby="all-clear-title" className={`${card} mt-8 px-5 py-6`}>
      <h2 id="all-clear-title" className="text-2xl">
        All clear
      </h2>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        No open inquiries, failed alerts, contracts waiting, retention reviews due, or public export changes.
      </p>
    </section>
  );
}
