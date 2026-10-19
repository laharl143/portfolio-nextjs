import { CLIENT_STATUSES, type ClientStatus } from "@/studio/db/constants";

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

export function parseClientListParams(params: RawSearchParams): ClientListFilters {
  const q = first(params.q).trim().slice(0, MAX_QUERY);
  const rawStatus = first(params.status);
  const status = (CLIENT_STATUSES as readonly string[]).includes(rawStatus) ? (rawStatus as ClientStatus) : null;
  const rawPage = first(params.page);
  const parsed = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const page = Math.min(Math.max(parsed, 1), MAX_PAGE);
  return { q, status, archived: first(params.archived) === "1", page };
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
