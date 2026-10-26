import { describe, expect, it } from "vitest";
import { InvalidInput } from "./errors";
import { parseBillingProfileInput, parseInvoiceInput, parseInvoiceStepInput } from "./input";

const profile = { businessName: "FAKE Studio", address: "Manila\nPhilippines", paymentInstructions: "FAKE transfer", documentTitle: "Invoice", defaultPaymentTermsDays: "15" };
const invoice = { lineDescription: ["FAKE service"], lineQuantity: ["0.33"], lineUnitPrice: ["100.01"], paymentTermsDays: "15" };
function fields(fn: () => unknown) {
  try { fn(); } catch (error) { if (error instanceof InvalidInput) return error.fieldErrors; throw error; }
  throw new Error("Expected invalid input");
}

describe("billing profile (AC-1)", () => {
  it("preserves multiline instructions and turns blank optional fields into null", () => {
    expect(parseBillingProfileInput({ ...profile, paymentInstructions: " Bank\nAccount ", tin: " " })).toMatchObject({ address: "Manila\nPhilippines", paymentInstructions: "Bank\nAccount", tin: null, email: null, defaultPaymentTermsDays: 15 });
  });
  it.each(["businessName", "address", "paymentInstructions", "documentTitle"] as const)("requires %s", (key) => {
    expect(fields(() => parseBillingProfileInput({ ...profile, [key]: " " }))).toHaveProperty(key);
  });
  it.each([["businessName",200],["address",1000],["tin",30],["email",320],["phone",50],["paymentInstructions",2000],["taxNote",200],["documentTitle",60]] as const)("rejects %s above its limit", (key, limit) => {
    expect(fields(() => parseBillingProfileInput({ ...profile, [key]: "1".repeat(limit + 1) }))).toHaveProperty(key);
  });
  it("rejects invalid TIN and email with the specified messages", () => {
    expect(fields(() => parseBillingProfileInput({ ...profile, tin: "12a", email: "x@y" }))).toMatchObject({ tin: "Use digits and hyphens only.", email: "Enter an email like name@example.com." });
  });
  it.each(["-1", "366", "1.5", "", "abc"])("refuses invalid payment terms %s", (terms) => {
    expect(fields(() => parseBillingProfileInput({ ...profile, defaultPaymentTermsDays: terms }))).toHaveProperty("defaultPaymentTermsDays");
  });
  it.each(["0", "365"])("accepts payment terms boundary %s", (terms) => {
    expect(parseBillingProfileInput({ ...profile, defaultPaymentTermsDays: terms }).defaultPaymentTermsDays).toBe(Number(terms));
  });
});

describe("invoice input (AC-2, AC-3, AC-5)", () => {
  it("rounds each line half up and retains line order", () => {
    const parsed = parseInvoiceInput({ ...invoice, lineDescription: ["FAKE first", "FAKE second"], lineQuantity: ["0.33", "0.01"], lineUnitPrice: ["100.01", "0.50"] });
    expect(parsed.lines.map(x => [x.position, x.description, x.amountMinor])).toEqual([[1,"FAKE first",BigInt(3300)],[2,"FAKE second",BigInt(1)]]);
  });
  it("refuses an empty invoice and more than 50 lines", () => {
    expect(fields(() => parseInvoiceInput({ paymentTermsDays: "15" })).lines).toBe("Add at least one line.");
    expect(fields(() => parseInvoiceInput({ ...invoice, lineDescription: Array(51).fill("FAKE"), lineQuantity: Array(51).fill("1"), lineUnitPrice: Array(51).fill("1") })).lines).toContain("50");
  });
  it("reports missing parallel fields against the correct line", () => {
    expect(fields(() => parseInvoiceInput({ ...invoice, lineDescription: ["FAKE", "FAKE"], lineQuantity: ["1"], lineUnitPrice: ["1", "2"] }))).toHaveProperty("lines.1.quantity");
  });
  it("rejects oversized lines and summed totals before persistence", () => {
    expect(fields(() => parseInvoiceInput({ ...invoice, lineQuantity: ["99999.99"], lineUnitPrice: ["9,999,999,999.99"] })).lines).toBe("The total is too large.");
    expect(fields(() => parseInvoiceInput({ ...invoice, lineDescription: ["FAKE", "FAKE"], lineQuantity: ["1","1"], lineUnitPrice: ["9,999,999,999.99", "0.01"] })).lines).toBe("The total is too large.");
  });
  it("keeps Unicode and multiline billing content", () => {
    expect(parseInvoiceInput({ ...invoice, lineDescription: ["FAKE ₱ ñ “quote” – service"], billToAddress: "Line 1\nLine 2", notes: "Notes\ncontinued" })).toMatchObject({ billToAddress: "Line 1\nLine 2", notes: "Notes\ncontinued" });
  });
});

describe("invoice steps (AC-9)", () => {
  it("requires a void reason", () => {
    expect(fields(() => parseInvoiceStepInput("void", { note: " " })).note).toBe("Say why this invoice is void.");
  });
  it.each(["", "2026-02-30", "not-a-date"])("refuses an invalid paid date %s", (paidOn) => {
    expect(fields(() => parseInvoiceStepInput("paid", { paidOn })).paidOn).toBe("Choose a date from the issue date to today.");
  });
  it("accepts a payment and drops paid fields from other transitions", () => {
    expect(parseInvoiceStepInput("paid", { paidOn: "2026-10-26", paymentMethod: "gcash", paymentReference: " FAKE ref " })).toMatchObject({ paidOn: "2026-10-26", paymentMethod: "gcash", paymentReference: "FAKE ref" });
    expect(parseInvoiceStepInput("sent", { paidOn: "2026-10-26", paymentMethod: "gcash" })).toEqual({ note: null, paidOn: null, paymentMethod: null, paymentReference: null });
  });
  it("refuses an unknown payment method and overlong reference", () => {
    expect(fields(() => parseInvoiceStepInput("paid", { paidOn: "2026-10-26", paymentMethod: "crypto", paymentReference: "x".repeat(201) }))).toMatchObject({ paymentMethod: expect.any(String), paymentReference: expect.any(String) });
  });
});
