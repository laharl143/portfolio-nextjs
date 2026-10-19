import { PLACEHOLDERS } from "@/studio/contracts/placeholders";

// The only placeholders a body may use (spec 0007, AC-1).
export default function PlaceholderList() {
  return (
    <details className="mt-4 rounded-lg border border-stone-300 p-3 text-sm dark:border-stone-700" open>
      <summary className="cursor-pointer font-semibold">Placeholders</summary>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {PLACEHOLDERS.map((placeholder) => (
          <div key={placeholder.name} className="contents">
            <dt>
              <code className="break-all rounded bg-stone-200 px-1 text-xs dark:bg-stone-800">{`{{${placeholder.name}}}`}</code>
            </dt>
            <dd className="text-stone-600 dark:text-stone-300">{placeholder.label}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
