import "server-only";
import "@/studio/marker";
import { unknownPlaceholderError } from "@/studio/contracts/placeholders";
import {
  BILLING_CADENCES,
  CLIENT_STATUSES,
  CONTACT_CHANNELS,
  PROJECT_STATUSES,
  SYSTEM_LAYERS,
  SYSTEM_LINK_STATES,
  SYSTEM_RESOURCE_KINDS,
  SYSTEM_STATUSES,
  type BillingCadence,
  type ClientStatus,
  type ContactChannel,
  type ProjectStatus,
  type SystemLayer,
  type SystemLinkState,
  type SystemResourceKind,
  type SystemStatus,
} from "@/studio/db/constants";
import { InvalidInput } from "./errors";

// Form input parsing for client tracking (spec 0006): trim every text field, blank optionals become null,
// and every problem lands in one InvalidInput keyed by form field name. The database checks stay the last line.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
// `updated_at::text`, e.g. 2026-10-19 08:15:30.123456+00.
const VERSION_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2}){0,2}$/;

// A bad id never reaches Postgres (no 22P02, no 500): callers throw their NotFound instead.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isVersion(value: unknown): value is string {
  return typeof value === "string" && VERSION_PATTERN.test(value);
}

type Raw = string | null | undefined;

class Collector {
  readonly errors: Record<string, string> = {};

  required(field: string, raw: Raw, label: string, max: number): string {
    const value = (raw ?? "").trim();
    if (!value) {
      this.errors[field] = `${label} is required.`;
    } else if (value.length > max) {
      this.errors[field] = `${label} must be at most ${max.toLocaleString("en-US")} characters.`;
    }
    return value;
  }

  optional(field: string, raw: Raw, label: string, max: number): string | null {
    const value = (raw ?? "").trim();
    if (!value) {
      return null;
    }
    if (value.length > max) {
      this.errors[field] = `${label} must be at most ${max.toLocaleString("en-US")} characters.`;
    }
    return value;
  }

  oneOf<T extends string>(field: string, raw: Raw, allowed: readonly T[], fallback: T | null, label: string): T | null {
    const value = (raw ?? "").trim();
    if (!value) {
      return fallback;
    }
    if (!(allowed as readonly string[]).includes(value)) {
      this.errors[field] = `Choose a valid ${label}.`;
      return fallback;
    }
    return value as T;
  }

  date(field: string, raw: Raw, label: string): string | null {
    const value = (raw ?? "").trim();
    if (!value) {
      return null;
    }
    const match = DATE_PATTERN.exec(value);
    if (!match) {
      this.errors[field] = `${label} must be a date (YYYY-MM-DD).`;
      return null;
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const roundTrip = new Date(Date.UTC(year, month - 1, day));
    if (
      year < 1900 ||
      year > 2100 ||
      roundTrip.getUTCFullYear() !== year ||
      roundTrip.getUTCMonth() !== month - 1 ||
      roundTrip.getUTCDate() !== day
    ) {
      this.errors[field] = `${label} is not a real date.`;
      return null;
    }
    return value;
  }

  finish() {
    if (Object.keys(this.errors).length > 0) {
      throw new InvalidInput(this.errors);
    }
  }
}

// https:// is added when no scheme is typed; only http or https with a dotted host and no credentials is kept.
function parseWebsite(c: Collector, raw: Raw): string | null {
  const value = (raw ?? "").trim();
  if (!value) {
    return null;
  }
  const withScheme = SCHEME_PATTERN.test(value) ? value : `https://${value}`;
  if (withScheme.length > 2048) {
    c.errors.website = "Website must be at most 2,048 characters.";
    return null;
  }
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    c.errors.website = "Enter a valid website address.";
    return null;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname.includes(".")) {
    c.errors.website = "Enter a valid website address.";
    return null;
  }
  if (url.username || url.password) {
    c.errors.website = "A website address cannot include a username or password.";
    return null;
  }
  return withScheme;
}

export type ClientFormInput = { name?: Raw; status?: Raw; website?: Raw; industry?: Raw };
export type ClientValues = { name: string; status: ClientStatus; website: string | null; industry: string | null };

export function parseClientInput(input: ClientFormInput): ClientValues {
  const c = new Collector();
  const values = {
    name: c.required("name", input.name, "Name", 200),
    status: c.oneOf("status", input.status, CLIENT_STATUSES, "lead", "status") as ClientStatus,
    website: parseWebsite(c, input.website),
    industry: c.optional("industry", input.industry, "Industry", 100),
  };
  c.finish();
  return values;
}

export type ContactFormInput = {
  fullName?: Raw;
  email?: Raw;
  phone?: Raw;
  preferredChannel?: Raw;
  isPrimary?: boolean;
};
export type ContactValues = {
  fullName: string;
  email: string | null;
  phone: string | null;
  preferredChannel: ContactChannel | null;
  isPrimary: boolean;
};

export function parseContactInput(input: ContactFormInput): ContactValues {
  const c = new Collector();
  const email = c.optional("email", input.email, "Email", 320);
  if (email && !c.errors.email && !EMAIL_PATTERN.test(email)) {
    c.errors.email = "Enter an email like name@example.com.";
  }
  const values = {
    fullName: c.required("fullName", input.fullName, "Full name", 200),
    email,
    phone: c.optional("phone", input.phone, "Phone", 50),
    preferredChannel: c.oneOf("preferredChannel", input.preferredChannel, CONTACT_CHANNELS, null, "channel"),
    isPrimary: input.isPrimary === true,
  };
  c.finish();
  return values;
}

export type ProjectFormInput = {
  name?: Raw;
  status?: Raw;
  description?: Raw;
  startDate?: Raw;
  targetEndDate?: Raw;
  actualEndDate?: Raw;
};
export type ProjectValues = {
  name: string;
  status: ProjectStatus;
  description: string | null;
  startDate: string | null;
  targetEndDate: string | null;
  actualEndDate: string | null;
};

export function parseProjectInput(input: ProjectFormInput): ProjectValues {
  const c = new Collector();
  const values = {
    name: c.required("name", input.name, "Name", 200),
    status: c.oneOf("status", input.status, PROJECT_STATUSES, "planned", "status") as ProjectStatus,
    description: c.optional("description", input.description, "Description", 5000),
    startDate: c.date("startDate", input.startDate, "Start date"),
    targetEndDate: c.date("targetEndDate", input.targetEndDate, "Target end date"),
    actualEndDate: c.date("actualEndDate", input.actualEndDate, "Actual end date"),
  };
  // YYYY-MM-DD strings compare in date order.
  if (values.startDate && values.targetEndDate && values.targetEndDate < values.startDate) {
    c.errors.targetEndDate = "Target end date cannot be before the start date.";
  }
  if (values.startDate && values.actualEndDate && values.actualEndDate < values.startDate) {
    c.errors.actualEndDate = "Actual end date cannot be before the start date.";
  }
  if (values.actualEndDate && !c.errors.actualEndDate && values.status !== "done" && values.status !== "cancelled") {
    c.errors.actualEndDate = "Set an actual end date only when the project is done or cancelled.";
  }
  c.finish();
  return values;
}

export function parseNoteBody(raw: Raw): string {
  const c = new Collector();
  const body = c.required("body", raw, "Note", 10000);
  c.finish();
  return body;
}

// Contracts and templates (spec 0007).

export const BODY_MAX = 50000;
// Pesos with at most 2 decimals, commas already stripped: 0 to 9,999,999,999.99.
const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

// A body keeps its text as typed (no trim, so Markdown spacing survives); only a blank one counts as empty.
function body(c: Collector, field: string, raw: Raw, label: string, required: boolean): string {
  const value = (raw ?? "").replace(/\r\n?/g, "\n");
  if (!value.trim()) {
    if (required) {
      c.errors[field] = `${label} is required.`;
    }
    return "";
  }
  if (value.length > BODY_MAX) {
    c.errors[field] = `${label} must be at most ${BODY_MAX.toLocaleString("en-US")} characters.`;
    return value;
  }
  const unknown = unknownPlaceholderError(value);
  if (unknown) {
    c.errors[field] = unknown;
  }
  return value;
}

export type TemplateFormInput = { name?: Raw; description?: Raw; body?: Raw };
export type TemplateValues = { name: string; description: string | null; body: string };

export function parseTemplateInput(input: TemplateFormInput): TemplateValues {
  const c = new Collector();
  const values = {
    name: c.required("name", input.name, "Name", 200),
    description: c.optional("description", input.description, "Description", 500),
    body: body(c, "body", input.body, "Template text", true),
  };
  c.finish();
  return values;
}

export type ContractFormInput = {
  title?: Raw;
  projectId?: Raw;
  amount?: Raw;
  billingCadence?: Raw;
  startDate?: Raw;
  endDate?: Raw;
  termsSummary?: Raw;
  body?: Raw;
};
export type ContractValues = {
  title: string;
  projectId: string | null;
  amountMinor: bigint | null;
  billingCadence: BillingCadence | null;
  startDate: string | null;
  endDate: string | null;
  termsSummary: string | null;
};

function parseAmount(c: Collector, raw: Raw): bigint | null {
  const value = (raw ?? "").trim().replace(/,/g, "");
  if (!value) {
    return null;
  }
  if (!AMOUNT_PATTERN.test(value)) {
    c.errors.amount = "Enter an amount in pesos, like 12,500.00 (at most 9,999,999,999.99).";
    return null;
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

// The AC-2 fields; the template choice only when `withTemplate` (the new form, `blank` becomes null),
// the body only when `withBody` (the edit form).
export function parseContractInput(
  input: ContractFormInput & { templateId?: Raw },
  opts: { withBody?: boolean; withTemplate?: boolean },
): ContractValues & { body?: string; templateId?: string | null } {
  const c = new Collector();
  let templateId: string | null | undefined;
  if (opts.withTemplate) {
    const raw = (input.templateId ?? "").trim();
    if (raw === "blank") {
      templateId = null;
    } else if (isUuid(raw)) {
      templateId = raw;
    } else {
      c.errors.templateId = raw ? "Choose a valid template." : "Choose a template, or Blank.";
    }
  }
  const projectId = (input.projectId ?? "").trim();
  if (projectId && !isUuid(projectId)) {
    c.errors.projectId = "Choose a valid project.";
  }
  const values: ContractValues & { body?: string; templateId?: string | null } = {
    title: c.required("title", input.title, "Title", 200),
    projectId: projectId && isUuid(projectId) ? projectId : null,
    amountMinor: parseAmount(c, input.amount),
    billingCadence: c.oneOf("billingCadence", input.billingCadence, BILLING_CADENCES, null, "billing cadence"),
    startDate: c.date("startDate", input.startDate, "Start date"),
    endDate: c.date("endDate", input.endDate, "End date"),
    termsSummary: c.optional("termsSummary", input.termsSummary, "Terms summary", 2000),
  };
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    c.errors.endDate = "End date cannot be before the start date.";
  }
  if (opts.withBody) {
    values.body = body(c, "body", input.body, "Contract text", false);
  }
  if (opts.withTemplate) {
    values.templateId = templateId ?? null;
  }
  c.finish();
  return values;
}

export function parseStatusNote(raw: Raw): string | null {
  const c = new Collector();
  const note = c.optional("note", raw, "Note", 1000);
  c.finish();
  return note;
}

// Systems map (spec 0008, AC-3 and AC-6). One parser for the forms and the import, so the import can never write
// a value the edit form would reject.

export const SYSTEM_SLUG_PATTERN = /^[a-z0-9-]{1,40}$/;
export const SYSTEM_LIMITS = {
  name: 80,
  publicSummary: 600,
  text: 5000,
  label: 120,
  url: 2048,
  stackItems: 30,
  stackItem: 60,
  sortOrder: 9999,
} as const;

export function isSystemSlug(value: unknown): value is string {
  return typeof value === "string" && SYSTEM_SLUG_PATTERN.test(value);
}

// Stack typed one item per line: each trimmed, blanks dropped.
export function stackLines(raw: Raw): string[] {
  return (raw ?? "")
    .split(/\r\n?|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function requiredChoice<T extends string>(c: Collector, field: string, raw: Raw, allowed: readonly T[], label: string): T {
  const value = (raw ?? "").trim();
  if (!value) {
    c.errors[field] = `${label} is required.`;
  } else if (!(allowed as readonly string[]).includes(value)) {
    c.errors[field] = `Choose a valid ${label.toLowerCase()}.`;
  }
  return value as T;
}

export type SystemFormInput = {
  slug?: Raw;
  name?: Raw;
  status?: Raw;
  layer?: Raw;
  published?: boolean;
  publicSummary?: Raw;
  summary?: Raw;
  lessons?: Raw;
  stack?: string[];
  sortOrder?: Raw;
};

export type SystemValues = {
  name: string;
  status: SystemStatus;
  layer: SystemLayer;
  // Derived, never typed (AC-3).
  standalone: boolean;
  published: boolean;
  publicSummary: string;
  summary: string | null;
  lessons: string | null;
  stack: string[];
  sortOrder: number;
};

// `withSlug` on create only; the slug never changes afterwards. Errors are keyed by form field name.
export function parseSystemInput(input: SystemFormInput, opts: { withSlug: boolean }): SystemValues & { id?: string } {
  const c = new Collector();
  let id: string | undefined;
  if (opts.withSlug) {
    id = (input.slug ?? "").trim();
    if (!id) {
      c.errors.slug = "Slug is required.";
    } else if (!SYSTEM_SLUG_PATTERN.test(id)) {
      c.errors.slug = "Use 1 to 40 lowercase letters, digits, or hyphens.";
    }
  }
  const stack = (input.stack ?? []).map((item) => item.trim()).filter(Boolean);
  if (stack.length > SYSTEM_LIMITS.stackItems) {
    c.errors.stack = `Stack can have at most ${SYSTEM_LIMITS.stackItems} items.`;
  } else if (stack.some((item) => item.length > SYSTEM_LIMITS.stackItem)) {
    c.errors.stack = `Each stack item must be at most ${SYSTEM_LIMITS.stackItem} characters.`;
  }
  const rawOrder = (input.sortOrder ?? "").trim();
  let sortOrder = 0;
  if (rawOrder) {
    if (!/^-?\d{1,4}$/.test(rawOrder)) {
      c.errors.sortOrder = `Sort order must be a whole number from -${SYSTEM_LIMITS.sortOrder} to ${SYSTEM_LIMITS.sortOrder}.`;
    } else {
      sortOrder = Number(rawOrder);
    }
  }
  const layer = requiredChoice(c, "layer", input.layer, SYSTEM_LAYERS, "Layer");
  const values: SystemValues & { id?: string } = {
    name: c.required("name", input.name, "Name", SYSTEM_LIMITS.name),
    status: requiredChoice(c, "status", input.status, SYSTEM_STATUSES, "Status"),
    layer,
    standalone: layer === "standalone",
    published: input.published === true,
    publicSummary: c.required("publicSummary", input.publicSummary, "Public summary", SYSTEM_LIMITS.publicSummary),
    summary: c.optional("summary", input.summary, "Summary", SYSTEM_LIMITS.text),
    lessons: c.optional("lessons", input.lessons, "Lessons", SYSTEM_LIMITS.text),
    stack,
    sortOrder,
  };
  if (id !== undefined) {
    values.id = id;
  }
  c.finish();
  return values;
}

export type SystemLinkValues = { label: string; state: SystemLinkState };

export function parseSystemLinkInput(input: { label?: Raw; state?: Raw }): SystemLinkValues {
  const c = new Collector();
  const values = {
    label: c.required("label", input.label, "Label", SYSTEM_LIMITS.label),
    state: requiredChoice(c, "state", input.state, SYSTEM_LINK_STATES, "State"),
  };
  c.finish();
  return values;
}

// An http or https URL with a host (AC-6). Kept as typed, apart from the trim.
function parseHttpUrl(c: Collector, field: string, raw: Raw): string {
  const value = (raw ?? "").trim();
  if (!value) {
    c.errors[field] = "URL is required.";
    return value;
  }
  if (value.length > SYSTEM_LIMITS.url) {
    c.errors[field] = `URL must be at most ${SYSTEM_LIMITS.url.toLocaleString("en-US")} characters.`;
    return value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    c.errors[field] = "Enter a full URL starting with http:// or https://.";
    return value;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) {
    c.errors[field] = "Enter a full URL starting with http:// or https://.";
  }
  return value;
}

export type SystemResourceValues = { kind: SystemResourceKind; label: string; url: string };

export function parseSystemResourceInput(input: { kind?: Raw; label?: Raw; url?: Raw }): SystemResourceValues {
  const c = new Collector();
  const values = {
    kind: requiredChoice(c, "kind", input.kind, SYSTEM_RESOURCE_KINDS, "Kind"),
    label: c.required("label", input.label, "Label", SYSTEM_LIMITS.label),
    url: parseHttpUrl(c, "url", input.url),
  };
  c.finish();
  return values;
}

export function parseSystemNoteBody(raw: Raw): string {
  const c = new Collector();
  const body = c.required("body", raw, "Note", SYSTEM_LIMITS.text);
  c.finish();
  return body;
}
