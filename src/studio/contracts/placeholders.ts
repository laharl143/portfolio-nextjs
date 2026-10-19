// The contract placeholder list (spec 0007, Placeholders). A pure module with no data and no "server-only", so the
// template editor's client preview and the server share it. Values are resolved by the data layer.

export const PLACEHOLDERS = [
  { name: "client.name", label: "Client name" },
  { name: "client.contact_name", label: "Primary contact" },
  { name: "client.contact_email", label: "Primary contact email" },
  { name: "project.name", label: "Project" },
  { name: "contract.title", label: "Contract title" },
  { name: "contract.amount", label: "Amount" },
  { name: "contract.billing_cadence", label: "Billing" },
  { name: "contract.start_date", label: "Start date" },
  { name: "contract.end_date", label: "End date" },
  { name: "contract.terms_summary", label: "Terms summary" },
  { name: "today", label: "Today" },
] as const;

export type PlaceholderName = (typeof PLACEHOLDERS)[number]["name"];

// A value per placeholder; null or blank counts as missing (an amount of 0 is the text "PHP 0.00", so present).
export type PlaceholderValues = Record<PlaceholderName, string | null>;

const LABELS = new Map<string, string>(PLACEHOLDERS.map((p) => [p.name, p.label]));

// Every `{{…}}` token. A lone `{{` with no closing `}}` never matches, so it stays literal text.
export const PLACEHOLDER_TOKEN = /\{\{([^{}]*)\}\}/g;

export function isPlaceholderName(name: string): name is PlaceholderName {
  return LABELS.has(name);
}

export function placeholderLabel(name: PlaceholderName): string {
  return LABELS.get(name) ?? name;
}

// The tokens of a body whose trimmed name is not on the list, each once, as typed (e.g. `{{Client.Name}}`).
export function unknownPlaceholders(body: string): string[] {
  const unknown = new Set<string>();
  for (const match of body.matchAll(PLACEHOLDER_TOKEN)) {
    if (!isPlaceholderName(match[1].trim())) {
      unknown.add(match[0]);
    }
  }
  return [...unknown];
}

// The field error for a body with unknown placeholders, or null when every token is known.
export function unknownPlaceholderError(body: string): string | null {
  const unknown = unknownPlaceholders(body);
  if (unknown.length === 0) {
    return null;
  }
  return `Unknown ${unknown.length === 1 ? "placeholder" : "placeholders"}: ${unknown.join(", ")}.`;
}

// Newlines inside a value collapse to single spaces; blank becomes null.
export function cleanValue(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const cleaned = value.replace(/\s*[\r\n]+\s*/g, " ").trim();
  return cleaned ? cleaned : null;
}

// Labels of the placeholders the body uses that have no value, each once, in first appearance order.
export function missingLabels(body: string, values: PlaceholderValues): string[] {
  const missing: string[] = [];
  for (const match of body.matchAll(PLACEHOLDER_TOKEN)) {
    const name = match[1].trim();
    if (isPlaceholderName(name) && cleanValue(values[name]) === null) {
      const label = placeholderLabel(name);
      if (!missing.includes(label)) {
        missing.push(label);
      }
    }
  }
  return missing;
}
