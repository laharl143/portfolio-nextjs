import type { RecordCounts } from "@/studio/data/counts";

export type HealthLine = { label: string; text: string; ok: boolean };

// Labels and order are fixed by spec 0004 (Value sourcing).
const COUNT_ROWS: { key: keyof RecordCounts; label: string }[] = [
  { key: "clients", label: "Clients" },
  { key: "contacts", label: "Contacts" },
  { key: "projects", label: "Projects" },
  { key: "contracts", label: "Contracts" },
  { key: "notes", label: "Notes" },
  { key: "systems", label: "Systems" },
  { key: "systemLinks", label: "System links" },
];

// The quiet system strip at the bottom (spec 0012, AC-9). Counts are null when hidden (spec 0004, AC-8).
export default function HealthFooter({ lines, counts }: { lines: HealthLine[]; counts: RecordCounts | null }) {
  return (
    <section
      aria-label="System health"
      className="mt-12 border-t border-stone-300 pt-4 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-400"
    >
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        {lines.map((line) => (
          <div key={line.label} className="flex items-center gap-2" data-ok={line.ok ? "true" : "false"}>
            <span
              aria-hidden="true"
              className={`inline-block size-2 rounded-full ${line.ok ? "bg-emerald-500" : "bg-red-600"}`}
            />
            <dt className="font-semibold">{line.label}</dt>
            <dd className={line.ok ? "" : "font-semibold text-red-700 dark:text-red-400"}>{line.text}</dd>
          </div>
        ))}
      </dl>
      {counts && (
        <dl aria-label="Record counts" className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {COUNT_ROWS.map(({ key, label }) => (
            <div key={key} className="flex gap-1">
              <dt>{label}</dt>
              <dd className="tabular-nums">{counts[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
