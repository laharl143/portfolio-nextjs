"use server";

import "server-only";
import { redirect } from "next/navigation";
import "@/studio/marker";
import type { ActionState } from "@/studio/clients/action-state";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/studio/db/constants";
import { saveBillingProfile } from "@/studio/data/billing-profiles";
import { InvalidInput, StudioDataError, pgErrorOf } from "@/studio/data/errors";
import { parseInvoiceStepInput, type InvoiceFormInput } from "@/studio/data/input";
import { changeInvoiceStatus, createInvoice, discardInvoice, sendInvoice, updateInvoice } from "@/studio/data/invoices";
import { requireStudioAccess } from "@/studio/guard";

// Invoice and billing profile server actions (spec 0013, API surface). Each one calls requireStudioAccess() first and
// redirect() last, both outside the try. Logs carry only the action name and the error code or class name, never
// invoice lines, profile details, or client details.

const CHECK_FIELDS = "Check the highlighted fields.";
const STATUS_CHANGED = "This invoice's status changed. Reload to see the latest.";

const MESSAGES: Record<string, string> = {
  STALE_RECORD: "This was changed elsewhere. Reload to see the latest.",
  INVALID_INVOICE_TRANSITION: STATUS_CHANGED,
  INVOICE_STATUS_CONFLICT: STATUS_CHANGED,
  INVOICE_NOT_EDITABLE: "Only a draft can be edited.",
  INVOICE_NOT_DISCARDABLE: "Only a draft can be discarded.",
  INVOICE_ARCHIVED: "This draft was discarded, so it cannot be changed.",
  INVOICE_NOT_FOUND: "This invoice no longer exists.",
  CONTRACT_NOT_INVOICEABLE: "Invoices can be made only from an active or ended contract.",
  CONTRACT_NOT_FOUND: "This contract no longer exists.",
  CONTRACT_ARCHIVED: "This contract is archived, so its invoices cannot be changed.",
  CLIENT_ARCHIVED: "This client is archived, so its invoices cannot be changed.",
  INVOICE_EMPTY: "Add at least one line before sending.",
  INVOICE_TOTAL_ZERO: "The total must be more than zero.",
  BILLING_PROFILE_MISSING: "Complete your billing profile before sending.",
  INVOICE_NUMBER_RACE: "Another invoice was sent at the same time. Try again.",
  PDF_RENDER_FAILED: "The PDF could not be made. Nothing was changed.",
  FILE_STORE_FAILED: "The PDF could not be saved. Nothing was changed.",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function texts(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((value) => (typeof value === "string" ? value : ""));
}

function pick(formData: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, text(formData, key)]));
}

function failure(actionName: string, err: unknown, values?: Record<string, string>): ActionState {
  if (err instanceof InvalidInput) {
    return { ok: false, code: err.code, message: CHECK_FIELDS, fieldErrors: err.fieldErrors, values };
  }
  if (err instanceof StudioDataError) {
    const message = MESSAGES[err.code];
    if (message) {
      return { ok: false, code: err.code, message, values };
    }
  }
  const detail = pgErrorOf(err)?.code ?? (err instanceof Error ? err.constructor.name : typeof err);
  console.error(`[studio] ${actionName} failed`, detail);
  return { ok: false, code: "UNEXPECTED", message: "Something went wrong. Try again.", values };
}

function invoicePath(invoiceId: string): string {
  return `/studio/invoices/${invoiceId}`;
}

// The invoice form's fields. Lines are parallel arrays in display order, echoed back as JSON in `values.lines`.
function invoiceForm(formData: FormData): { form: InvoiceFormInput; values: Record<string, string> } {
  const form = {
    lineDescription: texts(formData, "lineDescription"),
    lineQuantity: texts(formData, "lineQuantity"),
    lineUnitPrice: texts(formData, "lineUnitPrice"),
    paymentTermsDays: text(formData, "paymentTermsDays"),
    billToAddress: text(formData, "billToAddress"),
    notes: text(formData, "notes"),
  };
  const lines = form.lineDescription.map((description, index) => ({
    description,
    quantity: form.lineQuantity[index] ?? "",
    unitPrice: form.lineUnitPrice[index] ?? "",
  }));
  return {
    form,
    values: {
      lines: JSON.stringify(lines),
      paymentTermsDays: form.paymentTermsDays,
      billToAddress: form.billToAddress,
      notes: form.notes,
    },
  };
}

const PROFILE_FIELDS = [
  "businessName",
  "address",
  "tin",
  "email",
  "phone",
  "paymentInstructions",
  "taxNote",
  "documentTitle",
  "defaultPaymentTermsDays",
] as const;

export async function saveBillingProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const values = pick(formData, PROFILE_FIELDS);
  try {
    await saveBillingProfile(text(formData, "version"), values);
  } catch (err) {
    return failure("saveBillingProfileAction", err, values);
  }
  redirect("/studio/invoices/profile?saved=1");
}

export async function createInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const { form, values } = invoiceForm(formData);
  let invoiceId: string;
  try {
    invoiceId = (await createInvoice(text(formData, "contractId"), form)).id;
  } catch (err) {
    return failure("createInvoiceAction", err, values);
  }
  redirect(invoicePath(invoiceId));
}

export async function updateInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const invoiceId = text(formData, "invoiceId");
  const { form, values } = invoiceForm(formData);
  try {
    await updateInvoice(invoiceId, text(formData, "version"), form);
  } catch (err) {
    return failure("updateInvoiceAction", err, values);
  }
  redirect(invoicePath(invoiceId));
}

export async function sendInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const invoiceId = text(formData, "invoiceId");
  try {
    await sendInvoice(invoiceId, text(formData, "version"));
  } catch (err) {
    return failure("sendInvoiceAction", err);
  }
  redirect(invoicePath(invoiceId));
}

// Mark paid, undo paid, and void (AC-9).
export async function changeInvoiceStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const invoiceId = text(formData, "invoiceId");
  const values = pick(formData, ["note", "paidOn", "paymentMethod", "paymentReference"]);
  const to = text(formData, "to");
  try {
    if (!(INVOICE_STATUSES as readonly string[]).includes(to) || to === "draft") {
      throw new InvalidInput({ to: "Choose a valid step." });
    }
    const step = to as InvoiceStatus;
    await changeInvoiceStatus({
      invoiceId,
      from: text(formData, "from"),
      to: step,
      values: parseInvoiceStepInput(step, values),
    });
  } catch (err) {
    return failure("changeInvoiceStatusAction", err, values);
  }
  redirect(invoicePath(invoiceId));
}

export async function discardInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  let contractId: string;
  try {
    contractId = (await discardInvoice(text(formData, "invoiceId"))).contractId;
  } catch (err) {
    return failure("discardInvoiceAction", err);
  }
  redirect(`/studio/contracts/${contractId}`);
}
