import { describe, expect, it } from "vitest";
// covers: spec 0013 AC-2, AC-3 (quantity, money limits, half up rounding and formatting).
import {
  MAX_MONEY_MINOR,
  exceedsMoneyLimit,
  formatMoneyNumber,
  formatQuantity,
  invoiceTotalMinor,
  lineAmountMinor,
  parseQuantity,
  parseUnitPrice,
} from "./money";

// The invoice_lines_amount_rule check, written as Postgres evaluates it: numeric math, then floor.
function databaseRule(quantityHundredths: number, unitPriceMinor: bigint): bigint {
  const numerator = BigInt(quantityHundredths) * unitPriceMinor + BigInt(50);
  // floor of a non negative numeric division is integer division.
  return numerator / BigInt(100);
}

describe("parseQuantity", () => {
  it("reads whole and decimal quantities as hundredths", () => {
    expect(parseQuantity("1")).toBe(100);
    expect(parseQuantity("2.5")).toBe(250);
    expect(parseQuantity("0.01")).toBe(1);
    expect(parseQuantity(" 99999.99 ")).toBe(9999999);
  });

  it("refuses zero, too many decimals, too large, and non numbers", () => {
    for (const raw of ["0", "0.00", "1.234", "100000", "-1", "", "1e2", "1,000", "."]) {
      expect(parseQuantity(raw)).toBeNull();
    }
  });
});

describe("parseUnitPrice", () => {
  it("reads pesos with optional commas into centavos", () => {
    expect(parseUnitPrice("12,500")).toBe(BigInt(1250000));
    expect(parseUnitPrice("12500.00")).toBe(BigInt(1250000));
    expect(parseUnitPrice("0")).toBe(BigInt(0));
    expect(parseUnitPrice("100.5")).toBe(BigInt(10050));
    expect(parseUnitPrice("9,999,999,999.99")).toBe(MAX_MONEY_MINOR);
  });

  it("refuses negatives, too many decimals, and too large", () => {
    for (const raw of ["-1", "1.234", "10000000000", "", "abc", "₱100"]) {
      expect(parseUnitPrice(raw)).toBeNull();
    }
  });
});

describe("lineAmountMinor", () => {
  it("rounds half up to the centavo", () => {
    // 0.33 x 100.01 = 33.0033 → 33.00
    expect(lineAmountMinor(33, BigInt(10001))).toBe(BigInt(3300));
    // 0.01 x 0.50 = 0.005 → 0.01
    expect(lineAmountMinor(1, BigInt(50))).toBe(BigInt(1));
    // 0.01 x 0.49 = 0.0049 → 0.00
    expect(lineAmountMinor(1, BigInt(49))).toBe(BigInt(0));
    // 2.5 x 12,500.00 = 31,250.00
    expect(lineAmountMinor(250, BigInt(1250000))).toBe(BigInt(3125000));
  });

  it("matches the database check for edge and sampled inputs", () => {
    const quantities = [1, 33, 50, 99, 100, 149, 250, 9999999];
    const prices = [BigInt(0), BigInt(1), BigInt(49), BigInt(50), BigInt(10001), BigInt(999999), MAX_MONEY_MINOR];
    for (const q of quantities) {
      for (const u of prices) {
        expect(lineAmountMinor(q, u)).toBe(databaseRule(q, u));
      }
    }
  });

  it("does not overflow on the largest inputs", () => {
    const amount = lineAmountMinor(9999999, MAX_MONEY_MINOR);
    expect(amount > MAX_MONEY_MINOR).toBe(true);
    expect(exceedsMoneyLimit([amount])).toBe(true);
  });
});

describe("totals and limits", () => {
  it("sums line amounts", () => {
    expect(invoiceTotalMinor([{ amountMinor: BigInt(100) }, { amountMinor: BigInt(250) }])).toBe(BigInt(350));
    expect(invoiceTotalMinor([])).toBe(BigInt(0));
  });

  it("flags a total above the limit even when each line fits", () => {
    expect(exceedsMoneyLimit([MAX_MONEY_MINOR])).toBe(false);
    expect(exceedsMoneyLimit([MAX_MONEY_MINOR, BigInt(1)])).toBe(true);
  });
});

describe("formatting", () => {
  it("shows quantities without trailing zeros", () => {
    expect(formatQuantity(100)).toBe("1");
    expect(formatQuantity(250)).toBe("2.5");
    expect(formatQuantity(1)).toBe("0.01");
    expect(formatQuantity(9999999)).toBe("99999.99");
  });

  it("shows money as a bare grouped number", () => {
    expect(formatMoneyNumber(BigInt(1250000))).toBe("12,500.00");
    expect(formatMoneyNumber(BigInt(5))).toBe("0.05");
    expect(formatMoneyNumber(MAX_MONEY_MINOR)).toBe("9,999,999,999.99");
  });
});
