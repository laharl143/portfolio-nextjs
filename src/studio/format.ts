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
  one_time: "One time",
  viber: "Viber",
  whatsapp: "WhatsApp",
};

// Status and channel labels: `on_hold` → "On hold", others capitalised.
export function statusLabel(value: string): string {
  return SPECIAL_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

// Contract amounts (spec 0007, Value sourcing): centavos as `PHP 12,500.00`, with a plain space after the code.
export function formatAmount(amountMinor: bigint | number, currency: string): string {
  const text = new Intl.NumberFormat("en-PH", { style: "currency", currency, currencyDisplay: "code" }).format(
    Number(amountMinor) / 100,
  );
  return text.replace(/ /g, " ");
}

// The amount as the edit form shows it: a plain decimal with 2 places, no code or commas (e.g. `12500.00`).
export function amountInputValue(amountMinor: bigint | null): string {
  if (amountMinor === null) {
    return "";
  }
  const whole = amountMinor / BigInt(100);
  const cents = (amountMinor % BigInt(100)).toString().padStart(2, "0");
  return `${whole}.${cents}`;
}

// File names (spec 0007): lowercase ASCII letters, digits, and single hyphens, at most 80, else `contract`.
export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "contract";
}
