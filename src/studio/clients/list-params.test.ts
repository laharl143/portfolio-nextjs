import { describe, expect, it } from "vitest";
import { invoiceListHref, parseInvoiceListParams } from "./list-params";
import { addDays, studioToday } from "../format";

describe("invoice list and dates (AC-4, AC-8, AC-11)", () => {
  it("falls back for invalid filters and pages", () => {
    expect(parseInvoiceListParams({ status: "bogus", page: "abc" })).toEqual({ status: null, archived: false, page: 1 });
    expect(parseInvoiceListParams({ status: "overdue", archived: "1", page: "2" })).toEqual({ status: "overdue", archived: true, page: 2 });
  });
  it("preserves filters in paging links and omits page one", () => {
    expect(invoiceListHref({ status: "sent", archived: true, page: 2 })).toBe("/studio/invoices?status=sent&archived=1&page=2");
    expect(invoiceListHref({ page: 1 })).toBe("/studio/invoices");
  });
  it("uses Manila midnight and calendar days across years and leap days", () => {
    expect(studioToday(new Date("2026-12-31T16:00:00Z"))).toBe("2027-01-01");
    expect(addDays("2026-12-31", 15)).toBe("2027-01-15");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });
});
