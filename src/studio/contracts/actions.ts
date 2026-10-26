"use server";

import "server-only";
import { redirect } from "next/navigation";
import "@/studio/marker";
import type { ActionState } from "@/studio/clients/action-state";
import { CONTRACT_STATUSES, type ContractStatus } from "@/studio/db/constants";
import { archiveTemplate, createTemplate, updateTemplate } from "@/studio/data/contract-templates";
import {
  SIGNED_COPY_MAX_BYTES,
  addSignedCopy,
  archiveContract,
  changeContractStatus,
  createContractFromForm,
  sendContract,
  signContractWithCopy,
  updateContract,
} from "@/studio/data/contracts";
import { ContractHasMissingValues, InvalidInput, StudioDataError, pgErrorOf } from "@/studio/data/errors";
import { parseStatusNote } from "@/studio/data/input";
import { requireStudioAccess } from "@/studio/guard";

// Contract and template server actions (spec 0007, API surface). Each one calls requireStudioAccess() first and
// redirect() last, both outside the try, so their control flow errors are never caught. Logs carry only the action
// name and the error code or class name, never contract text, file bytes, or client details.

const CHECK_FIELDS = "Check the highlighted fields.";
const STALE = "This was changed elsewhere. Reload to see the latest.";
const STATUS_CHANGED = "This contract's status changed. Reload to see the latest.";
const FILE_ERROR = "Choose a PDF of 4 MB or less.";

const MESSAGES: Record<string, string> = {
  STALE_RECORD: STALE,
  INVALID_CONTRACT_TRANSITION: STATUS_CHANGED,
  CONTRACT_STATUS_CONFLICT: STATUS_CHANGED,
  CONTRACT_NOT_EDITABLE: "Only a draft can be edited.",
  CONTRACT_EMPTY: "Add the contract text before sending.",
  PDF_RENDER_FAILED: "The PDF could not be made. Nothing was changed.",
  FILE_STORE_FAILED: "The PDF could not be saved. Nothing was changed.",
  CONTRACT_ARCHIVED: "This contract is archived, so it cannot be changed.",
  CLIENT_ARCHIVED: "This client is archived, so its contracts cannot be changed.",
  CLIENT_NOT_FOUND: "This client no longer exists.",
  CONTRACT_NOT_FOUND: "This contract no longer exists.",
  CONTRACT_NOT_ARCHIVABLE: "Only a draft, ended, or cancelled contract can be archived.",
  CONTRACT_HAS_OPEN_INVOICES: "Settle or void this contract's open invoices before archiving.",
  CONTRACT_NOT_SIGNED: "A signed copy can be added only to a signed, active, or ended contract.",
  TEMPLATE_NOT_FOUND: "This template no longer exists or was archived.",
};

// Errors shown on the field that caused them.
const FIELD_ERRORS: Record<string, [field: string, message: string]> = {
  DUPLICATE_TEMPLATE_NAME: ["name", "A template with this name already exists."],
  PROJECT_NOT_FOUND: ["projectId", "Choose one of this client's live projects."],
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function pick(formData: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, text(formData, key)]));
}

function failure(
  actionName: string,
  err: unknown,
  values?: Record<string, string>,
  overrides: Record<string, string> = {},
): ActionState {
  if (err instanceof InvalidInput) {
    return { ok: false, code: err.code, message: CHECK_FIELDS, fieldErrors: err.fieldErrors, values };
  }
  if (err instanceof ContractHasMissingValues) {
    return { ok: false, code: err.code, message: `Fill these before sending: ${err.labels.join(", ")}.`, values };
  }
  if (err instanceof StudioDataError) {
    const field = FIELD_ERRORS[err.code];
    if (field) {
      return { ok: false, code: err.code, message: CHECK_FIELDS, fieldErrors: { [field[0]]: field[1] }, values };
    }
    const message = overrides[err.code] ?? MESSAGES[err.code];
    if (message) {
      return { ok: false, code: err.code, message, values };
    }
  }
  const detail = pgErrorOf(err)?.code ?? (err instanceof Error ? err.constructor.name : typeof err);
  console.error(`[studio] ${actionName} failed`, detail);
  return { ok: false, code: "UNEXPECTED", message: "Something went wrong. Try again.", values };
}

function contractPath(contractId: string): string {
  return `/studio/contracts/${contractId}`;
}

// The uploaded signed copy, checked on the server by size and magic bytes (spec 0007, AC-8). Null when none chosen.
async function signedCopyBytes(formData: FormData): Promise<Buffer | null> {
  const file = formData.get("signedCopy");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  if (file.size > SIGNED_COPY_MAX_BYTES) {
    throw new InvalidInput({ signedCopy: FILE_ERROR });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new InvalidInput({ signedCopy: FILE_ERROR });
  }
  return bytes;
}

const TEMPLATE_FIELDS = ["name", "description", "body"] as const;
const CONTRACT_FIELDS = [
  "title",
  "projectId",
  "amount",
  "billingCadence",
  "startDate",
  "endDate",
  "termsSummary",
] as const;

export async function createTemplateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const values = pick(formData, TEMPLATE_FIELDS);
  try {
    await createTemplate(values);
  } catch (err) {
    return failure("createTemplateAction", err, values);
  }
  redirect("/studio/templates");
}

export async function updateTemplateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const values = pick(formData, TEMPLATE_FIELDS);
  try {
    await updateTemplate(text(formData, "templateId"), text(formData, "version"), values);
  } catch (err) {
    return failure("updateTemplateAction", err, values);
  }
  redirect("/studio/templates");
}

export async function archiveTemplateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  try {
    await archiveTemplate(text(formData, "templateId"));
  } catch (err) {
    return failure("archiveTemplateAction", err);
  }
  redirect("/studio/templates");
}

export async function createContractAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const values = pick(formData, [...CONTRACT_FIELDS, "templateId"]);
  let contractId: string;
  try {
    contractId = (await createContractFromForm(text(formData, "clientId"), values)).id;
  } catch (err) {
    // A template archived since the form loaded is a field error on the picker (spec 0007, Value sourcing).
    if (err instanceof StudioDataError && err.code === "TEMPLATE_NOT_FOUND") {
      return {
        ok: false,
        code: err.code,
        message: CHECK_FIELDS,
        fieldErrors: { templateId: "This template was archived. Choose another." },
        values,
      };
    }
    return failure("createContractAction", err, values);
  }
  redirect(contractPath(contractId));
}

export async function updateContractAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const contractId = text(formData, "contractId");
  const values = pick(formData, [...CONTRACT_FIELDS, "body"]);
  try {
    await updateContract(contractId, text(formData, "version"), values);
  } catch (err) {
    return failure("updateContractAction", err, values);
  }
  redirect(contractPath(contractId));
}

// Every status step (spec 0007, AC-6 to AC-8): `sent` freezes the PDF, `signed` may store a signed copy.
export async function changeContractStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const contractId = text(formData, "contractId");
  const values = pick(formData, ["note"]);
  const to = text(formData, "to");
  try {
    if (!(CONTRACT_STATUSES as readonly string[]).includes(to)) {
      throw new InvalidInput({ to: "Choose a valid step." });
    }
    const note = parseStatusNote(values.note);
    const step = to as ContractStatus;
    if (step === "sent") {
      await sendContract({ contractId, version: text(formData, "version"), note });
    } else {
      const bytes = step === "signed" ? await signedCopyBytes(formData) : null;
      if (bytes) {
        await signContractWithCopy({ contractId, note, bytes });
      } else {
        await changeContractStatus({ contractId, to: step, note });
      }
    }
  } catch (err) {
    return failure("changeContractStatusAction", err, values);
  }
  redirect(contractPath(contractId));
}

export async function addSignedCopyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const contractId = text(formData, "contractId");
  try {
    const bytes = await signedCopyBytes(formData);
    if (!bytes) {
      throw new InvalidInput({ signedCopy: FILE_ERROR });
    }
    await addSignedCopy({ contractId, bytes });
  } catch (err) {
    return failure("addSignedCopyAction", err, undefined, {
      FILE_STORE_FAILED: "The file could not be saved. Nothing was changed.",
    });
  }
  redirect(contractPath(contractId));
}

export async function archiveContractAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  try {
    await archiveContract(text(formData, "contractId"));
  } catch (err) {
    return failure("archiveContractAction", err);
  }
  redirect(`/studio/clients/${clientId}`);
}
