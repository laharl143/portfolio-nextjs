import { formatAmount, formatDate, formatPlainDate, statusLabel } from "@/studio/format";
import { cleanValue, type PlaceholderValues } from "./placeholders";

// Placeholder values from their sources (spec 0007, Placeholders table). Pure: the data layer reads the rows.

export type ValueSources = {
  contract: {
    title: string;
    amountMinor: bigint | null;
    currency: string;
    billingCadence: string | null;
    startDate: string | null;
    endDate: string | null;
    termsSummary: string | null;
  };
  clientName: string;
  primaryContact: { fullName: string; email: string | null } | null;
  projectName: string | null;
};

// `today` in Asia/Manila: the current date for a preview or draft PDF, the send date for a frozen PDF.
export function todayText(now: Date = new Date()): string {
  return formatDate(now);
}

export function resolveValues(sources: ValueSources, today: string): PlaceholderValues {
  const { contract } = sources;
  return {
    "client.name": cleanValue(sources.clientName),
    "client.contact_name": cleanValue(sources.primaryContact?.fullName),
    "client.contact_email": cleanValue(sources.primaryContact?.email),
    "project.name": cleanValue(sources.projectName),
    "contract.title": cleanValue(contract.title),
    "contract.amount": contract.amountMinor === null ? null : formatAmount(contract.amountMinor, contract.currency),
    "contract.billing_cadence": contract.billingCadence ? statusLabel(contract.billingCadence) : null,
    "contract.start_date": contract.startDate ? formatPlainDate(contract.startDate) : null,
    "contract.end_date": contract.endDate ? formatPlainDate(contract.endDate) : null,
    "contract.terms_summary": cleanValue(contract.termsSummary),
    today,
  };
}

// True when two value maps fill every placeholder the same way.
export function sameValues(a: PlaceholderValues, b: PlaceholderValues): boolean {
  return (Object.keys(a) as (keyof PlaceholderValues)[]).every((key) => a[key] === b[key]);
}
