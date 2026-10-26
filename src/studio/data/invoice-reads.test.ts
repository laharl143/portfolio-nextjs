import { beforeEach, describe, expect, it, vi } from "vitest";
// covers: spec 0013 AC-13 (safe server errors and preserved not found behavior).
import { inspect } from "node:util";
import { ContractNotFound, InvoiceNotFound } from "./errors";
import { getBillingProfile } from "./billing-profiles";
import { getInvoiceFile } from "./invoice-files";
import { getInvoiceView, getNewInvoiceDefaults, listClientInvoices, listContractInvoices, listInvoices } from "./invoices";

const reads = vi.hoisted(() => ({ failure: undefined as unknown }));

vi.mock("./workspace", () => ({ getWorkspaceId: async () => "00000000-0000-4000-8000-000000000001" }));
vi.mock("@/studio/db/client", () => {
  const query = {
    from: () => query,
    innerJoin: () => query,
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    offset: () => query,
    then: (_resolve: unknown, reject: (error: unknown) => void) => reject(reads.failure),
  };
  return { getDb: () => ({ select: () => query }) };
});

const id = "00000000-0000-4000-8000-000000000002";
const operations = [
  ["listInvoices", () => listInvoices({ status: null, archived: false, page: 1 })],
  ["getInvoiceView", () => getInvoiceView(id)],
  ["getNewInvoiceDefaults", () => getNewInvoiceDefaults(id)],
  ["listContractInvoices", () => listContractInvoices(id)],
  ["listClientInvoices", () => listClientInvoices(id)],
  ["getBillingProfile", () => getBillingProfile()],
  ["getInvoiceFile", () => getInvoiceFile(id)],
] as const;

beforeEach(() => {
  reads.failure = Object.assign(new Error("Failed query: SELECT private_invoice_text"), {
    query: "SELECT private_invoice_text",
    params: ["FAKE private billing details"],
    cause: Object.assign(new Error("FAKE private driver detail"), { code: "42P01" }),
  });
});

describe("invoice read failures exposed to Next", () => {
  it.each(operations)("%s keeps only the operation and code", async (operation, read) => {
    const failure = await read().catch((error: unknown) => error);
    expect(failure).toMatchObject({ name: "InvoiceReadFailed", message: `${operation} failed (42P01)`, code: "42P01" });
    expect(failure).not.toBe(reads.failure);
    for (const text of ["private_invoice_text", "private billing details", "private driver detail"]) {
      expect(inspect(failure, { depth: 10 })).not.toContain(text);
    }
    expect(failure).not.toHaveProperty("cause");
    expect(failure).not.toHaveProperty("query");
    expect(failure).not.toHaveProperty("params");
  });

  it("replaces arbitrary error text and codes with UNEXPECTED", async () => {
    reads.failure = Object.assign(new Error("FAKE client details"), { code: "FAKE private code" });
    await expect(getBillingProfile()).rejects.toMatchObject({ message: "getBillingProfile failed (UNEXPECTED)", code: "UNEXPECTED" });
  });

  it("preserves not found errors so lookup pages still return 404", async () => {
    reads.failure = new InvoiceNotFound();
    await expect(getInvoiceView(id)).rejects.toBe(reads.failure);
    reads.failure = new ContractNotFound();
    await expect(getNewInvoiceDefaults(id)).rejects.toBe(reads.failure);
  });
});
