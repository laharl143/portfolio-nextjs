// Display formatting for studio pages (spec 0006, Value sourcing). No data access, so client forms may use the labels.

export const STUDIO_TIME_ZONE = "Asia/Manila";

const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: STUDIO_TIME_ZONE });
const dateTimeFormat = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: STUDIO_TIME_ZONE,
});
// Postgres `date` values are calendar days, so they format in UTC to never shift a day.
const plainDateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" });

// Last activity and "Archived on".
export function formatDate(d: Date): string {
  return dateFormat.format(d);
}

// Note times.
export function formatDateTime(d: Date): string {
  return dateTimeFormat.format(d);
}

// A `date` column string (YYYY-MM-DD).
export function formatPlainDate(value: string): string {
  return plainDateFormat.format(new Date(`${value}T00:00:00Z`));
}

const SPECIAL_LABELS: Record<string, string> = {
  on_hold: "On hold",
  viber: "Viber",
  whatsapp: "WhatsApp",
};

// Status and channel labels: `on_hold` → "On hold", others capitalised.
export function statusLabel(value: string): string {
  return SPECIAL_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}
