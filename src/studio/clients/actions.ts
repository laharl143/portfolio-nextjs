"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import "@/studio/marker";
import { archiveClient, createClient, updateClient } from "@/studio/data/clients";
import { archiveContact, createContact, updateContact } from "@/studio/data/contacts";
import { InvalidInput, StudioDataError, pgErrorOf } from "@/studio/data/errors";
import { createClientNote, deleteNote, updateNote } from "@/studio/data/notes";
import { archiveProject, createProject, updateProject } from "@/studio/data/projects";
import { requireStudioAccess } from "@/studio/guard";
import type { ActionState } from "./action-state";

// Client tracking server actions (spec 0006, API surface). Each one calls requireStudioAccess() first, outside
// the try, and calls redirect() outside the try too, so their control flow errors are never caught.

type Entity = "client" | "contact" | "project" | "note";

const CHECK_FIELDS = "Check the highlighted fields.";

const MESSAGES: Record<string, string> = {
  CLIENT_ARCHIVED: "This client is archived, so it cannot be changed.",
  CLIENT_NOT_FOUND: "This client no longer exists.",
  CONTACT_NOT_FOUND: "This contact no longer exists or was archived.",
  PROJECT_NOT_FOUND: "This project no longer exists or was archived.",
  NOTE_NOT_FOUND: "This note no longer exists.",
  CLIENT_HAS_LIVE_CONTRACTS: "This client has a signed or active contract, so it cannot be archived yet.",
  PROJECT_HAS_LIVE_CONTRACTS: "This project has a signed or active contract.",
};

// Duplicate errors become a field error on the field that caused them.
const DUPLICATE_FIELDS: Record<string, [field: string, message: string]> = {
  DUPLICATE_CLIENT_NAME: ["name", "Another client already has this name."],
  DUPLICATE_CONTACT_EMAIL: ["email", "Another contact of this client already uses this email."],
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function pick(formData: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, text(formData, key)]));
}

// Logs only the action name and the error's Postgres code or class name: never the message, the input, or the state.
function failure(actionName: string, entity: Entity, err: unknown, values?: Record<string, string>): ActionState {
  if (err instanceof InvalidInput) {
    return { ok: false, code: err.code, message: CHECK_FIELDS, fieldErrors: err.fieldErrors, values };
  }
  if (err instanceof StudioDataError) {
    const duplicate = DUPLICATE_FIELDS[err.code];
    if (duplicate) {
      return { ok: false, code: err.code, message: CHECK_FIELDS, fieldErrors: { [duplicate[0]]: duplicate[1] }, values };
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

function detailPath(clientId: string): string {
  return `/studio/clients/${clientId}`;
}

const CLIENT_FIELDS = ["name", "status", "website", "industry"] as const;
const CONTACT_FIELDS = ["fullName", "email", "phone", "preferredChannel"] as const;
const PROJECT_FIELDS = ["name", "status", "description", "startDate", "targetEndDate", "actualEndDate"] as const;

// The checkbox comes back as "on" in `values` so the form can keep it ticked.
function contactInput(formData: FormData) {
  const values = pick(formData, CONTACT_FIELDS);
  const isPrimary = formData.get("isPrimary") === "on";
  return { input: { ...values, isPrimary }, values: { ...values, isPrimary: isPrimary ? "on" : "" } };
}

export async function createClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const values = pick(formData, CLIENT_FIELDS);
  let clientId: string;
  try {
    clientId = (await createClient(values)).id;
  } catch (err) {
    return failure("createClientAction", "client", err, values);
  }
  redirect(detailPath(clientId));
}

export async function updateClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  const values = pick(formData, CLIENT_FIELDS);
  try {
    await updateClient(clientId, text(formData, "version"), values);
  } catch (err) {
    return failure("updateClientAction", "client", err, values);
  }
  redirect(detailPath(clientId));
}

export async function archiveClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  try {
    await archiveClient(text(formData, "clientId"));
  } catch (err) {
    return failure("archiveClientAction", "client", err);
  }
  redirect("/studio/clients");
}

export async function createContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  const { input, values } = contactInput(formData);
  try {
    await createContact(clientId, input);
  } catch (err) {
    return failure("createContactAction", "contact", err, values);
  }
  redirect(detailPath(clientId));
}

export async function updateContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  const { input, values } = contactInput(formData);
  try {
    await updateContact(clientId, text(formData, "contactId"), text(formData, "version"), input);
  } catch (err) {
    return failure("updateContactAction", "contact", err, values);
  }
  redirect(detailPath(clientId));
}

export async function archiveContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  try {
    await archiveContact(clientId, text(formData, "contactId"));
  } catch (err) {
    return failure("archiveContactAction", "contact", err);
  }
  redirect(detailPath(clientId));
}

export async function createProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  const values = pick(formData, PROJECT_FIELDS);
  try {
    await createProject(clientId, values);
  } catch (err) {
    return failure("createProjectAction", "project", err, values);
  }
  redirect(detailPath(clientId));
}

export async function updateProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  const values = pick(formData, PROJECT_FIELDS);
  try {
    await updateProject(clientId, text(formData, "projectId"), text(formData, "version"), values);
  } catch (err) {
    return failure("updateProjectAction", "project", err, values);
  }
  redirect(detailPath(clientId));
}

export async function archiveProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  try {
    await archiveProject(clientId, text(formData, "projectId"));
  } catch (err) {
    return failure("archiveProjectAction", "project", err);
  }
  redirect(detailPath(clientId));
}

// Stays on the page: the add note box resets after { ok: true }.
export async function createNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  const values = pick(formData, ["body"]);
  try {
    await createClientNote(clientId, values.body);
  } catch (err) {
    return failure("createNoteAction", "note", err, values);
  }
  revalidatePath(detailPath(clientId));
  return { ok: true };
}

export async function updateNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  const values = pick(formData, ["body"]);
  try {
    await updateNote(clientId, text(formData, "noteId"), text(formData, "version"), values.body);
  } catch (err) {
    return failure("updateNoteAction", "note", err, values);
  }
  redirect(detailPath(clientId));
}

export async function deleteNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStudioAccess();
  const clientId = text(formData, "clientId");
  try {
    await deleteNote(clientId, text(formData, "noteId"));
  } catch (err) {
    return failure("deleteNoteAction", "note", err);
  }
  revalidatePath(detailPath(clientId));
  return { ok: true };
}
