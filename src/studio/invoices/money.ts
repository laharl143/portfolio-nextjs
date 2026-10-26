// Invoice money math (spec 0013, Money math). Pure, no data or secrets, so it skips "server-only": the client invoice
// form shares it to show line amounts and the total as you type. Quantities are hundredths, money is centavos.

// The largest line amount or total, in centavos (PHP 9,999,999,999.99), the same as the database checks.
export const MAX_MONEY_MINOR = BigInt("999999999999");
export const MAX_LINES = 50;

const QUANTITY_PATTERN = /^\d{1,5}(\.\d{1,2})?$/;
// Pesos with at most 2 decimals, commas already stripped: 0 to 9,999,999,999.99.
const UNIT_PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
const HUNDRED = BigInt(100);
const HALF = BigInt(50);

export const QUANTITY_MESSAGE = "Enter a quantity from 0.01 to 99,999.99, with at most 2 decimals.";
export const UNIT_PRICE_MESSAGE = "Enter an amount in pesos, like 12,500 or 12500.00.";
export const TOTAL_TOO_LARGE_MESSAGE = "The total is too large.";

// "2.5" → 250. Null when the text is not a quantity from 0.01 to 99,999.99 with at most 2 decimals.
export function parseQuantity(raw: string): number | null {
  const value = raw.trim();
  if (!QUANTITY_PATTERN.test(value)) {
    return null;
  }
  const [whole, fraction = ""] = value.split(".");
  const hundredths = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return hundredths >= 1 ? hundredths : null;
}

// "12,500.5" → 1250050n centavos. Null when the text is not pesos from 0 to 9,999,999,999.99.
export function parseUnitPrice(raw: string): bigint | null {
  const value = raw.trim().replace(/,/g, "");
  if (!UNIT_PRICE_PATTERN.test(value)) {
    return null;
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * HUNDRED + BigInt(fraction.padEnd(2, "0"));
}

// Quantity times unit price, rounded half up to the centavo: the same rule as the invoice_lines_amount_rule check.
export function lineAmountMinor(quantityHundredths: number, unitPriceMinor: bigint): bigint {
  return (BigInt(quantityHundredths) * unitPriceMinor + HALF) / HUNDRED;
}

export function invoiceTotalMinor(lines: readonly { amountMinor: bigint }[]): bigint {
  return lines.reduce((sum, line) => sum + line.amountMinor, BigInt(0));
}

// True when any line amount, or their sum, is above PHP 9,999,999,999.99.
export function exceedsMoneyLimit(amounts: readonly bigint[]): boolean {
  let total = BigInt(0);
  for (const amount of amounts) {
    if (amount > MAX_MONEY_MINOR) {
      return true;
    }
    total += amount;
  }
  return total > MAX_MONEY_MINOR;
}

// 250 → "2.5", 100 → "1": no trailing zeros.
export function formatQuantity(hundredths: number): string {
  const whole = Math.floor(hundredths / 100);
  const fraction = String(hundredths % 100).padStart(2, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

// Centavos as a bare number with grouping, like `12,500.00`, for the PDF's money columns.
export function formatMoneyNumber(amountMinor: bigint): string {
  const whole = (amountMinor / HUNDRED).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const cents = (amountMinor % HUNDRED).toString().padStart(2, "0");
  return `${whole}.${cents}`;
}
