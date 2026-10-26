"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { formatAmount } from "@/studio/format";
import {
  MAX_LINES,
  MAX_MONEY_MINOR,
  exceedsMoneyLimit,
  lineAmountMinor,
  parseQuantity,
  parseUnitPrice,
} from "@/studio/invoices/money";
import { TextAreaField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { fieldError, hint, input, label, primaryButton, secondaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
export type InvoiceLineInput = { description: string; quantity: string; unitPrice: string };
type Line = InvoiceLineInput & { key: number };

const smallButton =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-stone-400 px-2 text-sm font-semibold hover:bg-stone-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 dark:border-stone-600 dark:hover:bg-stone-700";

// Lines echoed back after a failure (JSON in `values.lines`), else the record's own lines.
function initialLines(state: ActionState, initial: InvoiceLineInput[]): InvoiceLineInput[] {
  if (!state.ok && state.values?.lines) {
    try {
      const parsed = JSON.parse(state.values.lines) as InvoiceLineInput[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to the record's lines.
    }
  }
  return initial;
}

// The amount of one line as typed, or null while it is not a valid quantity and price yet.
function amountOf(line: InvoiceLineInput): bigint | null {
  const quantity = parseQuantity(line.quantity);
  const unitPrice = parseUnitPrice(line.unitPrice);
  return quantity === null || unitPrice === null ? null : lineAmountMinor(quantity, unitPrice);
}

function money(amountMinor: bigint | null, currency: string): string {
  if (amountMinor === null) {
    return "—";
  }
  return amountMinor > MAX_MONEY_MINOR ? "Too large" : formatAmount(amountMinor, currency);
}

function LinesEditor({ state, initial, currency }: { state: ActionState; initial: InvoiceLineInput[]; currency: string }) {
  // Keys are 1..n on first paint (pure, so the server and the browser render the same ids); an added line takes
  // the next free key.
  const idPrefix = useId();
  const [lines, setLines] = useState<Line[]>(() =>
    initialLines(state, initial).map((line, index) => ({ ...line, key: index + 1 })),
  );
  const groupError = errorOf(state, "lines");

  const update = (key: number, patch: Partial<InvoiceLineInput>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const move = (index: number, by: number) =>
    setLines((current) => {
      const next = [...current];
      const [line] = next.splice(index, 1);
      next.splice(index + by, 0, line);
      return next;
    });
  const remove = (key: number) => setLines((current) => current.filter((line) => line.key !== key));
  const add = () =>
    setLines((current) =>
      current.length >= MAX_LINES
        ? current
        : [
            ...current,
            {
              description: "",
              quantity: "1",
              unitPrice: "",
              key: current.reduce((max, line) => Math.max(max, line.key), 0) + 1,
            },
          ],
    );

  const amounts = lines.map(amountOf);
  const valid = amounts.filter((amount): amount is bigint => amount !== null);
  const total = valid.reduce((sum, amount) => sum + amount, BigInt(0));
  const tooLarge = exceedsMoneyLimit(valid);

  return (
    <fieldset aria-describedby={groupError ? "lines-error" : undefined} className="grid gap-4">
      <legend className="text-lg font-semibold">Lines</legend>
      {groupError && (
        <p id="lines-error" role="alert" className={fieldError}>
          {groupError}
        </p>
      )}
      <ol className="grid gap-4">
        {lines.map((line, index) => {
          const id = `${idPrefix}line-${line.key}`;
          const errors = {
            description: errorOf(state, `lines.${index}.description`),
            quantity: errorOf(state, `lines.${index}.quantity`),
            unitPrice: errorOf(state, `lines.${index}.unitPrice`),
          };
          const n = index + 1;
          return (
            <li key={line.key} className="rounded-xl border border-stone-300 p-4 dark:border-stone-700">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">Line {n}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move line ${n} up`}
                    className={smallButton}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === lines.length - 1}
                    aria-label={`Move line ${n} down`}
                    className={smallButton}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    aria-label={`Remove line ${n}`}
                    className={smallButton}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_7rem_10rem_10rem]">
                <div>
                  <label htmlFor={`${id}-description`} className={label}>
                    Description
                  </label>
                  <input
                    id={`${id}-description`}
                    name="lineDescription"
                    value={line.description}
                    onChange={(event) => update(line.key, { description: event.target.value })}
                    maxLength={500}
                    autoComplete="off"
                    aria-invalid={errors.description ? true : undefined}
                    aria-describedby={errors.description ? `${id}-description-error` : undefined}
                    className={input}
                  />
                  {errors.description && (
                    <p id={`${id}-description-error`} className={fieldError}>
                      {errors.description}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor={`${id}-quantity`} className={label}>
                    Qty
                  </label>
                  <input
                    id={`${id}-quantity`}
                    name="lineQuantity"
                    value={line.quantity}
                    onChange={(event) => update(line.key, { quantity: event.target.value })}
                    inputMode="decimal"
                    maxLength={9}
                    autoComplete="off"
                    aria-invalid={errors.quantity ? true : undefined}
                    aria-describedby={errors.quantity ? `${id}-quantity-error` : undefined}
                    className={`${input} text-right tabular-nums`}
                  />
                  {errors.quantity && (
                    <p id={`${id}-quantity-error`} className={fieldError}>
                      {errors.quantity}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor={`${id}-unit-price`} className={label}>
                    Unit price ({currency})
                  </label>
                  <input
                    id={`${id}-unit-price`}
                    name="lineUnitPrice"
                    value={line.unitPrice}
                    onChange={(event) => update(line.key, { unitPrice: event.target.value })}
                    inputMode="decimal"
                    maxLength={20}
                    autoComplete="off"
                    aria-invalid={errors.unitPrice ? true : undefined}
                    aria-describedby={errors.unitPrice ? `${id}-unit-price-error` : undefined}
                    className={`${input} text-right tabular-nums`}
                  />
                  {errors.unitPrice && (
                    <p id={`${id}-unit-price-error`} className={fieldError}>
                      {errors.unitPrice}
                    </p>
                  )}
                </div>
                <div>
                  <p className={label}>Amount</p>
                  <p className="mt-1.5 flex h-11 items-center justify-end text-sm tabular-nums" aria-live="polite">
                    {money(amounts[index], currency)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button type="button" onClick={add} disabled={lines.length >= MAX_LINES} className={secondaryButton}>
            Add line
          </button>
          {lines.length >= MAX_LINES && <p className={hint}>An invoice can have at most {MAX_LINES} lines.</p>}
        </div>
        <p className="text-lg font-semibold tabular-nums" aria-live="polite">
          Total {tooLarge ? "too large" : formatAmount(total, currency)}
        </p>
      </div>
    </fieldset>
  );
}

// New invoice and edit draft invoice (spec 0013, AC-2 and AC-5): lines you can add, remove, and reorder, with each
// amount and the total shown as you type through the same money.ts rule the server uses.
export default function InvoiceForm({
  action,
  initial,
  hidden,
  currency,
  submitLabel,
  cancelHref,
  reloadHref,
}: {
  action: Action;
  initial: { lines: InvoiceLineInput[]; paymentTermsDays: string; billToAddress: string; notes: string };
  hidden: Record<string, string>;
  currency: string;
  submitLabel: string;
  cancelHref: string;
  reloadHref?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const flat = { paymentTermsDays: initial.paymentTermsDays, billToAddress: initial.billToAddress, notes: initial.notes };
  const value = (key: string) => valueOf(state, flat, key);

  return (
    <form key={stateKey(state)} action={formAction} noValidate className="grid gap-6">
      {Object.entries(hidden).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <div className="max-w-xl">
        <FormMessage state={state} reloadHref={reloadHref} />
      </div>
      <LinesEditor state={state} initial={initial.lines} currency={currency} />
      <div className="grid max-w-xl gap-5">
        <TextField
          name="paymentTermsDays"
          label="Payment terms (days)"
          required
          inputMode="numeric"
          maxLength={3}
          hint="The due date is the issue date plus these days, set when you mark it sent."
          defaultValue={value("paymentTermsDays")}
          error={errorOf(state, "paymentTermsDays")}
        />
        <TextAreaField
          name="billToAddress"
          label="Bill to address"
          maxLength={1000}
          rows={3}
          defaultValue={value("billToAddress")}
          error={errorOf(state, "billToAddress")}
        />
        <TextAreaField
          name="notes"
          label="Notes"
          maxLength={2000}
          defaultValue={value("notes")}
          error={errorOf(state, "notes")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <PendingButton className={primaryButton}>{submitLabel}</PendingButton>
        <Link href={cancelHref} className={textLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
