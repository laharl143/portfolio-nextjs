import { statusLabel } from "@/studio/format";

const NEUTRAL = "bg-stone-300 text-stone-800 dark:bg-stone-700 dark:text-stone-200";
const TONES: Record<string, string> = {
  lead: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  planned: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  on_hold: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

// Client and project status as a small text label (never colour alone).
export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[status] ?? NEUTRAL}`}>
      {statusLabel(status)}
    </span>
  );
}
