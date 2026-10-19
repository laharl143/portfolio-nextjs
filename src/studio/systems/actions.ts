"use server";

import "server-only";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import "@/studio/marker";
import type { ActionState } from "@/studio/clients/action-state";
import { getDb } from "@/studio/db/client";
import { ImportHasErrors, InvalidInput, StudioDataError, pgErrorOf } from "@/studio/data/errors";
import { stackLines } from "@/studio/data/input";
import { createSystemNote, deleteSystemNote, updateSystemNote } from "@/studio/data/notes";
import { createSystemLink, deleteSystemLink, updateSystemLink } from "@/studio/data/system-links";
import { createSystemResource, deleteSystemResource, updateSystemResource } from "@/studio/data/system-resources";
import { archiveSystem, createSystem, restoreSystem, updateSystem } from "@/studio/data/systems";
import { getWorkspaceId } from "@/studio/data/workspace";
import { requireStudioAccess } from "@/studio/guard";
import { products } from "./bundled";
import { applyImportPlan, parseImportJson, planImport, readImportState, type ImportPlan } from "./import";
import type { ImportState } from "./import-state";

// Systems map server actions (spec 0008, API surface). Each one calls requireStudioAccess() first, outside the try,
// and redirect() outside the try too. Logs carry only the action name and the error code (AC-12).

type Entity = "system" | "link" | "resource" | "note";

const CHECK_FIELDS = "Check the highlighted fields.";

const MESSAGES: Record<string, string> = {
  SYSTEM_ARCHIVED: "Restore the archived system first.",
  SYSTEM_NOT_FOUND: "This system no longer exists.",
  SYSTEM_LINK_NOT_FOUND: "This link no longer exists.",
  SYSTEM_RESOURCE_NOT_FOUND: "This resource no longer exists.",
  NOTE_NOT_FOUND: "This note no longer exists.",
};

// Errors that belong to one field.
const FIELD_ERRORS: Record<string, [field: string, message: string]> = {
  DUPLICATE_SYSTEM_SLUG: ["slug", "Another system already uses this slug."],
  SELF_LINK: ["toSystemId", "A system cannot link to itself."],
  DUPLICATE_LINK: ["toSystemId", "This system already sends a link to that system."],
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function pick(formData: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, text(formData, key)]));
}

function failure(actionName: string, entity: Entity, err: unknown, values?: Record<string, string>): ActionState {
  if (err instanceof InvalidInput) {
    return { ok: false, code: err.code, message: CHECK_FIELDS, fieldErrors: err.fieldErrors, values };
  }
  if (err instanceof StudioDataError) {
    const field = FIELD_ERRORS[err.code];
    if (field) {
      return { ok: false, code: err.code, message: CHECK_FIELDS, fieldErrors: { [field[0]]: field[1] }, values };
    }
    if (err.code === "STALE_RECORD") {
      return { ok: false, code: err.code, message: `This ${entity} changed since you opened it.`, values };
    }
    const message = MESSAGES[err.code];
    if (message) {
      return { ok: false, code: err.code, message, values };
    }
  }
  const detail = pgErrorOf(err)?.code ?? (err instanceof Error ? err.constructor.name : typeof err);
  console.error(`[studio] ${actionName} failed`, detail);
  return { ok: false, code: "UNEXPECTED", message: "Something went wrong. Try again.", values };
}

function detailPath(systemId: string): string {
  return `/studio/systems/${encodeURIComponent(systemId)}`;
}

const SYSTEM_FIELDS = ["name", "status", "layer", "publicSummary", "summary", "lessons", "stack", "sortOrder"] as const;

// The checkbox comes back as "on" in `values`, and the stack textarea as typed.
function systemInput(formData: FormData, withSlug: boolean) {
  const values = pick(formData, withSlug ? ["slug", ...SYSTEM_FIELDS] : SYSTEM_FIELDS);
  const published = formData.get("published") === "on";
  return {
    input: { ...values, published, stack: stackLines(values.stack) },
    values: { ...values, published: published ? "on" : "" },
  };
}

export async function createSystemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const { input, values } = systemInput(formData, true);
  let systemId: string;
  try {
    systemId = (await createSystem(input)).id;
  } catch (err) {
    return failure("createSystemAction", "system", err, values);
  }
  redirect(detailPath(systemId));
}

export async function updateSystemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  const { input, values } = systemInput(formData, false);
  try {
    await updateSystem(systemId, text(formData, "version"), input);
  } catch (err) {
    return failure("updateSystemAction", "system", err, values);
  }
  redirect(detailPath(systemId));
}

export async function archiveSystemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  try {
    await archiveSystem(systemId);
  } catch (err) {
    return failure("archiveSystemAction", "system", err);
  }
  redirect(detailPath(systemId));
}

export async function restoreSystemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  try {
    await restoreSystem(systemId);
  } catch (err) {
    return failure("restoreSystemAction", "system", err);
  }
  redirect(detailPath(systemId));
}

const LINK_FIELDS = ["toSystemId", "label", "state"] as const;

export async function createSystemLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  const values = pick(formData, LINK_FIELDS);
  try {
    await createSystemLink(systemId, values);
  } catch (err) {
    return failure("createSystemLinkAction", "link", err, values);
  }
  redirect(detailPath(systemId));
}

export async function updateSystemLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  const values = pick(formData, ["label", "state"]);
  try {
    await updateSystemLink(systemId, text(formData, "linkId"), text(formData, "version"), values);
  } catch (err) {
    return failure("updateSystemLinkAction", "link", err, values);
  }
  redirect(detailPath(systemId));
}

export async function deleteSystemLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  try {
    await deleteSystemLink(systemId, text(formData, "linkId"));
  } catch (err) {
    return failure("deleteSystemLinkAction", "link", err);
  }
  redirect(detailPath(systemId));
}

const RESOURCE_FIELDS = ["kind", "label", "url"] as const;

export async function createSystemResourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  const values = pick(formData, RESOURCE_FIELDS);
  try {
    await createSystemResource(systemId, values);
  } catch (err) {
    return failure("createSystemResourceAction", "resource", err, values);
  }
  redirect(detailPath(systemId));
}

export async function updateSystemResourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  const values = pick(formData, RESOURCE_FIELDS);
  try {
    await updateSystemResource(systemId, text(formData, "resourceId"), text(formData, "version"), values);
  } catch (err) {
    return failure("updateSystemResourceAction", "resource", err, values);
  }
  redirect(detailPath(systemId));
}

export async function deleteSystemResourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  try {
    await deleteSystemResource(systemId, text(formData, "resourceId"));
  } catch (err) {
    return failure("deleteSystemResourceAction", "resource", err);
  }
  redirect(detailPath(systemId));
}

export async function createSystemNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  const values = pick(formData, ["body"]);
  try {
    await createSystemNote(systemId, values.body);
  } catch (err) {
    return failure("createSystemNoteAction", "note", err, values);
  }
  redirect(detailPath(systemId));
}

export async function updateSystemNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  const values = pick(formData, ["body"]);
  try {
    await updateSystemNote(systemId, text(formData, "noteId"), text(formData, "version"), values.body);
  } catch (err) {
    return failure("updateSystemNoteAction", "note", err, values);
  }
  redirect(detailPath(systemId));
}

export async function deleteSystemNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const systemId = text(formData, "systemId");
  try {
    await deleteSystemNote(systemId, text(formData, "noteId"));
  } catch (err) {
    return failure("deleteSystemNoteAction", "note", err);
  }
  redirect(detailPath(systemId));
}

// The import (spec 0008, AC-7). Preview plans without writing; apply parses and plans the posted JSON again inside
// one transaction with the systems locked, never trusting the preview. The JSON is never logged.

const bundledSummaries = () => new Map(products.map((product) => [product.id as string, product.summary]));

function planState(plan: ImportPlan, json: string, stage: "preview" | "applied"): ImportState {
  const base = { stage, plan: plan.rows, errorCount: plan.errorCount, values: { json } };
  if (plan.errorCount > 0) {
    const count = plan.errorCount === 1 ? "1 row has an error" : `${plan.errorCount} rows have errors`;
    return { ...base, ok: false, code: "INVALID_INPUT", message: `${count}. Fix the JSON, then preview again.` };
  }
  return { ...base, ok: true, counts: plan.counts };
}

function importFailure(actionName: string, err: unknown, json: string): ImportState {
  if (err instanceof InvalidInput) {
    return {
      ok: false,
      code: err.code,
      message: err.fieldErrors.json ?? CHECK_FIELDS,
      fieldErrors: err.fieldErrors,
      values: { json },
    };
  }
  const pgCode = pgErrorOf(err)?.code;
  console.error(`[studio] ${actionName} failed`, pgCode ?? (err instanceof Error ? err.constructor.name : typeof err));
  // 55P03 lock_not_available (lock_timeout), 57014 query_canceled (statement_timeout).
  if (pgCode === "55P03" || pgCode === "57014") {
    return {
      ok: false,
      code: "UNEXPECTED",
      message: "An earlier import is still finishing in the database. Nothing was imported. Wait a minute, then try again.",
      values: { json },
    };
  }
  return { ok: false, code: "UNEXPECTED", message: "Something went wrong. Nothing was imported. Try again.", values: { json } };
}

export async function previewSystemsImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireStudioAccess();
  const json = text(formData, "json");
  try {
    const input = parseImportJson(json);
    const workspaceId = await getWorkspaceId();
    const plan = await getDb().transaction(async (tx) =>
      planImport(input, await readImportState(tx, workspaceId, false), bundledSummaries()),
    );
    return planState(plan, json, "preview");
  } catch (err) {
    return importFailure("previewSystemsImport", err, json);
  }
}

export async function applySystemsImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireStudioAccess();
  const json = text(formData, "json");
  let refused: ImportPlan | undefined;
  try {
    const input = parseImportJson(json);
    const workspaceId = await getWorkspaceId();
    const plan = await getDb().transaction(async (tx) => {
      // Fail fast instead of hanging: a lock wait (for example on an earlier import Vercel killed mid transaction)
      // errors after 5 s, and a transaction left open by a killed request is ended by Postgres after 15 s idle.
      await tx.execute(sql`set local lock_timeout = '5s'`);
      await tx.execute(sql`set local statement_timeout = '20s'`);
      await tx.execute(sql`set local idle_in_transaction_session_timeout = '15s'`);
      const planned = planImport(input, await readImportState(tx, workspaceId, true), bundledSummaries());
      if (planned.errorCount > 0) {
        refused = planned;
        throw new ImportHasErrors();
      }
      await applyImportPlan(tx, workspaceId, planned);
      return planned;
    });
    return planState(plan, json, "applied");
  } catch (err) {
    if (err instanceof ImportHasErrors && refused) {
      return planState(refused, json, "preview");
    }
    return importFailure("applySystemsImport", err, json);
  }
}
