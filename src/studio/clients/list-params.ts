import { CLIENT_STATUSES, CONTRACT_STATUSES, type ClientStatus, type ContractStatus } from "@/studio/db/constants";

// The client list's URL state (spec 0006, AC-3 and Value sourcing): `q`, `status`, `archived=1`, and `page`.
// Plain functions, no data access.

export type ClientListFilters = {
  q: string;
  status: ClientStatus | null;
  archived: boolean;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const MAX_QUERY = 100;
const MAX_PAGE = 10000;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// An invalid page becomes 1.
export function parsePage(params: RawSearchParams): number {
  const rawPage = first(params.page);
  const parsed = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  return Math.min(Math.max(parsed, 1), MAX_PAGE);
}

export function parseClientListParams(params: RawSearchParams): ClientListFilters {
  const q = first(params.q).trim().slice(0, MAX_QUERY);
  const rawStatus = first(params.status);
  const status = (CLIENT_STATUSES as readonly string[]).includes(rawStatus) ? (rawStatus as ClientStatus) : null;
  return { q, status, archived: first(params.archived) === "1", page: parsePage(params) };
}

// Builds a list link. Page 1 is left out of the URL.
export function clientListHref(filters: Partial<ClientListFilters>): string {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.archived) {
    params.set("archived", "1");
  }
  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  const query = params.toString();
  return query ? `/studio/clients?${query}` : "/studio/clients";
}

// The contract list's URL state (spec 0007, AC-9): `status`, `archived=1`, and `page`. An unknown status is ignored.
export type ContractListFilters = { status: ContractStatus | null; archived: boolean; page: number };

export function parseContractListParams(params: RawSearchParams): ContractListFilters {
  const rawStatus = first(params.status);
  const status = (CONTRACT_STATUSES as readonly string[]).includes(rawStatus) ? (rawStatus as ContractStatus) : null;
  return { status, archived: first(params.archived) === "1", page: parsePage(params) };
}

export function contractListHref(filters: Partial<ContractListFilters>): string {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.archived) {
    params.set("archived", "1");
  }
  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  const query = params.toString();
  return query ? `/studio/contracts?${query}` : "/studio/contracts";
}

// The invoice list's URL state (spec 0013, AC-11): `status` (`overdue` is derived, `sent` includes overdue ones),
// `archived=1` (discarded drafts), and `page`. An unknown status shows all.
export const INVOICE_FILTERS = ["draft", "sent", "overdue", "paid", "void"] as const;
export type InvoiceFilter = (typeof INVOICE_FILTERS)[number];
export type InvoiceListFilters = { status: InvoiceFilter | null; archived: boolean; page: number };

export function parseInvoiceListParams(params: RawSearchParams): InvoiceListFilters {
  const rawStatus = first(params.status);
  const status = (INVOICE_FILTERS as readonly string[]).includes(rawStatus) ? (rawStatus as InvoiceFilter) : null;
  return { status, archived: first(params.archived) === "1", page: parsePage(params) };
}

export function invoiceListHref(filters: Partial<InvoiceListFilters>): string {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.archived) {
    params.set("archived", "1");
  }
  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  const query = params.toString();
  return query ? `/studio/invoices?${query}` : "/studio/invoices";
}
