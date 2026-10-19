import "server-only";
import "@/studio/marker";
import { and, eq, isNotNull } from "drizzle-orm";
import type { Tx } from "@/studio/db/client";
import type { SystemLinkState, SystemStatus } from "@/studio/db/constants";
import { notes, systemLinks, systemResources, systems } from "@/studio/db/schema";
import { InvalidInput } from "@/studio/data/errors";
import {
  isSystemSlug,
  parseSystemInput,
  parseSystemLinkInput,
  parseSystemNoteBody,
  parseSystemResourceInput,
  type SystemFormInput,
  type SystemValues,
} from "@/studio/data/input";
import type { ImportCounts, ImportPlanRow } from "./import-state";
import { IMPORT_MAX_BYTES } from "./import-state";

// The paste in import (spec 0008, AC-7 and AC-8). parseImportJson() and planImport() are pure apart from the state
// they are handed; applyImportPlan() writes a plan inside the caller's transaction. Matches systems by slug and links
// by from and to, never deletes, never changes `archived_at` or `published`, never writes to an archived system.

// Artifact status values, plus the schema's own values as is.
const STATUS_MAP: Record<string, SystemStatus> = {
  built: "built",
  next: "next",
  ongoing: "in-progress",
  idea: "planned",
  "in-progress": "in-progress",
  planned: "planned",
};

// Parser field → artifact key, so a field error points at the pasted key.
const ARTIFACT_KEY: Record<string, string> = {
  name: "name",
  status: "status",
  layer: "group",
  sortOrder: "order",
  publicSummary: "publicSummary",
  summary: "summary",
  lessons: "lesson",
  stack: "stack",
};

const PUBLIC_SYSTEM_FIELDS = new Set(["name", "status", "layer", "sortOrder", "publicSummary"]);
const COMPARED_FIELDS = ["name", "status", "layer", "sortOrder", "publicSummary", "summary", "lessons", "stack"] as const;

export type ImportDbState = {
  systems: Map<
    string,
    {
      archived: boolean;
      published: boolean;
      name: string;
      status: SystemStatus;
      layer: string;
      sortOrder: number;
      publicSummary: string;
      summary: string | null;
      lessons: string | null;
      stack: string[];
    }
  >;
  links: Map<string, { id: string; label: string; state: SystemLinkState }>;
  noteBodies: Map<string, Set<string>>;
  resourceUrls: Map<string, Set<string>>;
};

export type BundledSummaries = Map<string, string>;

type SystemOp =
  | { kind: "create"; id: string; values: SystemValues }
  | { kind: "update"; id: string; changes: Partial<SystemValues> };
type LinkOp =
  | { kind: "create"; from: string; to: string; label: string; state: SystemLinkState }
  | { kind: "update"; id: string; label: string; state: SystemLinkState };

export type ImportPlan = {
  rows: ImportPlanRow[];
  errorCount: number;
  systemOps: SystemOp[];
  linkOps: LinkOp[];
  noteOps: { systemId: string; body: string }[];
  resourceOps: { systemId: string; url: string }[];
  counts: ImportCounts;
};

const zero = () => ({ created: 0, updated: 0, unchanged: 0, skipped: 0 });

const linkKey = (from: string, to: string) => `${from}\n${to}`;

// Size, JSON, and the top level shape. Throws InvalidInput keyed by `json`.
export function parseImportJson(raw: string): { systems: unknown[]; links: unknown[] } {
  if (!raw.trim()) {
    throw new InvalidInput({ json: "Paste the exported JSON." });
  }
  if (Buffer.byteLength(raw, "utf8") > IMPORT_MAX_BYTES) {
    throw new InvalidInput({ json: "The JSON is larger than 256 KB." });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidInput({ json: "This is not valid JSON." });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InvalidInput({ json: 'Expected an object like { "systems": [...], "links": [...] }.' });
  }
  const { systems: systemRows, links: linkRows } = parsed as { systems?: unknown; links?: unknown };
  if (!Array.isArray(systemRows)) {
    throw new InvalidInput({ json: '"systems" must be a list.' });
  }
  if (linkRows !== undefined && !Array.isArray(linkRows)) {
    throw new InvalidInput({ json: '"links" must be a list.' });
  }
  return { systems: systemRows, links: linkRows ?? [] };
}

function optionalText(row: Record<string, unknown>, key: string, path: string, errors: string[]): string | undefined {
  const value = row[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    errors.push(`${path}.${key}: must be text`);
    return undefined;
  }
  return value;
}

function sameStack(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

// Adds the parser's errors under their pasted keys, skipping a key the row checks already reported.
function fieldErrors(err: unknown, path: string, keys: Record<string, string>, errors: string[]) {
  if (!(err instanceof InvalidInput)) {
    throw err;
  }
  for (const [field, message] of Object.entries(err.fieldErrors)) {
    const at = `${path}.${keys[field] ?? field}`;
    if (!errors.some((error) => error.startsWith(`${at}:`))) {
      errors.push(`${at}: ${message}`);
    }
  }
}

export function planImport(
  input: { systems: unknown[]; links: unknown[] },
  db: ImportDbState,
  bundled: BundledSummaries,
): ImportPlan {
  const plan: ImportPlan = {
    rows: [],
    errorCount: 0,
    systemOps: [],
    linkOps: [],
    noteOps: [],
    resourceOps: [],
    counts: { systems: zero(), links: zero(), notes: zero(), resources: zero() },
  };
  const seenIds = new Set<string>();

  input.systems.forEach((item, index) => {
    const path = `systems[${index}]`;
    const errors: string[] = [];
    const extras: string[] = [];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      plan.rows.push({ entity: "system", path, key: "?", action: "error", errors: [`${path}: must be an object`] });
      plan.errorCount += 1;
      return;
    }
    const row = item as Record<string, unknown>;

    const id = row.id;
    let key = "?";
    if (typeof id !== "string" || !id) {
      errors.push(`${path}.id: required`);
    } else if (!isSystemSlug(id)) {
      errors.push(`${path}.id: "${id}" must be 1 to 40 lowercase letters, digits, or hyphens`);
    } else if (seenIds.has(id)) {
      errors.push(`${path}.id: duplicate id "${id}"`);
      key = id;
    } else {
      seenIds.add(id);
      key = id;
    }

    let status: SystemStatus | undefined;
    if (typeof row.status !== "string" || !row.status) {
      errors.push(`${path}.status: required`);
    } else if (!STATUS_MAP[row.status]) {
      errors.push(`${path}.status: unknown status "${row.status}"`);
    } else {
      status = STATUS_MAP[row.status];
    }

    let order = "0";
    if (row.order !== undefined && row.order !== null) {
      if (typeof row.order !== "number" || !Number.isInteger(row.order)) {
        errors.push(`${path}.order: must be a whole number`);
      } else {
        order = String(row.order);
      }
    }

    let stack: string[] = [];
    if (Array.isArray(row.stack) && row.stack.every((value) => typeof value === "string")) {
      stack = row.stack as string[];
    } else if (typeof row.stack === "string") {
      stack = row.stack.split("·");
    } else if (row.stack !== undefined && row.stack !== null) {
      errors.push(`${path}.stack: must be text`);
    }

    const name = optionalText(row, "name", path, errors);
    const group = optionalText(row, "group", path, errors);
    const summary = optionalText(row, "summary", path, errors);
    const lesson = optionalText(row, "lesson", path, errors);
    const publicSummary = optionalText(row, "publicSummary", path, errors);
    const noteText = optionalText(row, "notes", path, errors)?.trim();
    const repo = optionalText(row, "repo", path, errors)?.trim();

    const existing = key !== "?" ? db.systems.get(key) : undefined;
    if (existing?.archived && errors.length === 0) {
      plan.rows.push({ entity: "system", path, key, action: "skipped", extras: ["archived"] });
      plan.counts.systems.skipped += 1;
      if (noteText) plan.counts.notes.skipped += 1;
      if (repo) plan.counts.resources.skipped += 1;
      return;
    }

    const candidate: SystemFormInput = {
      name,
      status,
      layer: group,
      sortOrder: order,
      summary,
      lessons: lesson,
      stack,
      published: existing ? existing.published : bundled.has(key),
      publicSummary: publicSummary ?? existing?.publicSummary ?? bundled.get(key),
    };
    if (!existing && candidate.publicSummary === undefined) {
      // With no usable id there is no bundled entry to fall back on; the id error already says why.
      errors.push(key === "?" ? `${path}.publicSummary: unknown until the id is fixed` : `${path}.publicSummary: publicSummary required`);
    }

    let values: SystemValues | undefined;
    try {
      values = parseSystemInput(candidate, { withSlug: false });
    } catch (err) {
      fieldErrors(err, path, ARTIFACT_KEY, errors);
    }

    if (noteText) {
      try {
        parseSystemNoteBody(noteText);
      } catch (err) {
        fieldErrors(err, path, { body: "notes" }, errors);
      }
    }
    if (repo) {
      try {
        parseSystemResourceInput({ kind: "repo", label: "Repository", url: repo });
      } catch (err) {
        fieldErrors(err, path, { url: "repo" }, errors);
      }
    }

    if (errors.length > 0 || !values) {
      plan.rows.push({ entity: "system", path, key, action: "error", errors });
      plan.errorCount += 1;
      return;
    }

    if (noteText) {
      if (db.noteBodies.get(key)?.has(noteText)) {
        plan.counts.notes.unchanged += 1;
      } else {
        plan.noteOps.push({ systemId: key, body: noteText });
        plan.counts.notes.created += 1;
        extras.push("adds a note");
      }
    }
    if (repo) {
      if (db.resourceUrls.get(key)?.has(repo)) {
        plan.counts.resources.unchanged += 1;
      } else {
        plan.resourceOps.push({ systemId: key, url: repo });
        plan.counts.resources.created += 1;
        extras.push("adds a repo resource");
      }
    }

    if (!existing) {
      plan.systemOps.push({ kind: "create", id: key, values });
      plan.counts.systems.created += 1;
      plan.rows.push({
        entity: "system",
        path,
        key,
        action: "create",
        extras: [values.published ? "published (on the public page)" : "not published", ...extras],
      });
      return;
    }

    const changes: Partial<SystemValues> = {};
    const fields: string[] = [];
    for (const field of COMPARED_FIELDS) {
      const before = existing[field];
      const after = values[field];
      const same = Array.isArray(before) ? sameStack(before, after as string[]) : before === after;
      if (!same) {
        fields.push(field);
        Object.assign(changes, { [field]: after });
      }
    }
    if (changes.layer !== undefined) {
      changes.standalone = values.standalone;
    }
    if (fields.length === 0) {
      plan.counts.systems.unchanged += 1;
      plan.rows.push({ entity: "system", path, key, action: "unchanged", extras });
      return;
    }
    plan.systemOps.push({ kind: "update", id: key, changes });
    plan.counts.systems.updated += 1;
    plan.rows.push({
      entity: "system",
      path,
      key,
      action: "update",
      fields,
      public: fields.some((field) => PUBLIC_SYSTEM_FIELDS.has(field)),
      extras,
    });
  });

  const seenPairs = new Set<string>();
  input.links.forEach((item, index) => {
    const path = `links[${index}]`;
    const errors: string[] = [];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      plan.rows.push({ entity: "link", path, key: "?", action: "error", errors: [`${path}: must be an object`] });
      plan.errorCount += 1;
      return;
    }
    const row = item as Record<string, unknown>;
    const ends: Record<"from" | "to", string> = { from: "", to: "" };
    for (const end of ["from", "to"] as const) {
      const value = row[end];
      if (typeof value !== "string" || !value) {
        errors.push(`${path}.${end}: required`);
      } else if (!seenIds.has(value) && !db.systems.has(value)) {
        errors.push(`${path}.${end}: unknown system "${value}"`);
      } else {
        ends[end] = value;
      }
    }
    const key = `${ends.from || "?"} → ${ends.to || "?"}`;
    if (ends.from && ends.from === ends.to) {
      errors.push(`${path}: a system cannot link to itself`);
    }
    if (ends.from && ends.to) {
      const pair = linkKey(ends.from, ends.to);
      if (seenPairs.has(pair)) {
        errors.push(`${path}: duplicate link ${ends.from} → ${ends.to}`);
      }
      seenPairs.add(pair);
    }
    if (typeof row.state === "string" && row.state !== "live" && row.state !== "planned") {
      errors.push(`${path}.state: unknown state "${row.state}"`);
    }
    let values: { label: string; state: SystemLinkState } | undefined;
    try {
      values = parseSystemLinkInput({
        label: typeof row.label === "string" ? row.label : undefined,
        state: typeof row.state === "string" ? row.state : undefined,
      });
    } catch (err) {
      fieldErrors(err, path, { label: "label", state: "state" }, errors);
    }
    if (errors.length > 0 || !values) {
      plan.rows.push({ entity: "link", path, key, action: "error", errors: [...new Set(errors)] });
      plan.errorCount += 1;
      return;
    }

    if (db.systems.get(ends.from)?.archived || db.systems.get(ends.to)?.archived) {
      plan.counts.links.skipped += 1;
      plan.rows.push({ entity: "link", path, key, action: "skipped", extras: ["an end is archived"] });
      return;
    }
    const existing = db.links.get(linkKey(ends.from, ends.to));
    if (!existing) {
      plan.linkOps.push({ kind: "create", from: ends.from, to: ends.to, ...values });
      plan.counts.links.created += 1;
      plan.rows.push({ entity: "link", path, key, action: "create" });
      return;
    }
    const fields = [
      ...(existing.label !== values.label ? ["label"] : []),
      ...(existing.state !== values.state ? ["state"] : []),
    ];
    if (fields.length === 0) {
      plan.counts.links.unchanged += 1;
      plan.rows.push({ entity: "link", path, key, action: "unchanged" });
      return;
    }
    plan.linkOps.push({ kind: "update", id: existing.id, ...values });
    plan.counts.links.updated += 1;
    plan.rows.push({ entity: "link", path, key, action: "update", fields, public: true });
  });

  return plan;
}

// Reads what the planner compares against, inside the transaction. `lock` takes row locks on the workspace's systems.
export async function readImportState(tx: Tx, workspaceId: string, lock: boolean): Promise<ImportDbState> {
  const systemQuery = tx
    .select({
      id: systems.id,
      archivedAt: systems.archivedAt,
      published: systems.published,
      name: systems.name,
      status: systems.status,
      layer: systems.layer,
      sortOrder: systems.sortOrder,
      publicSummary: systems.publicSummary,
      summary: systems.summary,
      lessons: systems.lessons,
      stack: systems.stack,
    })
    .from(systems)
    .where(eq(systems.workspaceId, workspaceId))
    .orderBy(systems.id);
  const systemRows = lock ? await systemQuery.for("update") : await systemQuery;
  const [linkRows, noteRows, resourceRows] = await Promise.all([
    tx
      .select({ id: systemLinks.id, from: systemLinks.fromSystemId, to: systemLinks.toSystemId, label: systemLinks.label, state: systemLinks.state })
      .from(systemLinks)
      .where(eq(systemLinks.workspaceId, workspaceId)),
    tx
      .select({ systemId: notes.systemId, body: notes.body })
      .from(notes)
      .where(and(eq(notes.workspaceId, workspaceId), isNotNull(notes.systemId))),
    tx
      .select({ systemId: systemResources.systemId, url: systemResources.url })
      .from(systemResources)
      .where(eq(systemResources.workspaceId, workspaceId)),
  ]);

  const group = (rows: { systemId: string | null; value: string }[]) => {
    const map = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!row.systemId) continue;
      const set = map.get(row.systemId) ?? new Set<string>();
      set.add(row.value);
      map.set(row.systemId, set);
    }
    return map;
  };

  return {
    systems: new Map(
      systemRows.map(({ id, archivedAt, ...rest }) => [id, { ...rest, archived: archivedAt !== null }]),
    ),
    links: new Map(linkRows.map((link) => [linkKey(link.from, link.to), { id: link.id, label: link.label, state: link.state }])),
    noteBodies: group(noteRows.map((note) => ({ systemId: note.systemId, value: note.body.trim() }))),
    resourceUrls: group(resourceRows.map((resource) => ({ systemId: resource.systemId, value: resource.url }))),
  };
}

// Writes a plan with no errors: systems, then links, notes, and resources. Creates go in one multi row insert per
// table, so a first import is a handful of statements, not one per row (Vercel kills the request at its time limit).
export async function applyImportPlan(tx: Tx, workspaceId: string, plan: ImportPlan): Promise<void> {
  const systemCreates = plan.systemOps.flatMap((op) => (op.kind === "create" ? [op] : []));
  if (systemCreates.length > 0) {
    await tx.insert(systems).values(systemCreates.map((op) => ({ id: op.id, workspaceId, ...op.values })));
  }
  for (const op of plan.systemOps) {
    if (op.kind === "update") {
      await tx
        .update(systems)
        .set(op.changes)
        .where(and(eq(systems.id, op.id), eq(systems.workspaceId, workspaceId)));
    }
  }
  const linkCreates = plan.linkOps.flatMap((op) => (op.kind === "create" ? [op] : []));
  if (linkCreates.length > 0) {
    await tx.insert(systemLinks).values(
      linkCreates.map((op) => ({ workspaceId, fromSystemId: op.from, toSystemId: op.to, label: op.label, state: op.state })),
    );
  }
  for (const op of plan.linkOps) {
    if (op.kind === "update") {
      await tx
        .update(systemLinks)
        .set({ label: op.label, state: op.state })
        .where(and(eq(systemLinks.id, op.id), eq(systemLinks.workspaceId, workspaceId)));
    }
  }
  if (plan.noteOps.length > 0) {
    await tx.insert(notes).values(plan.noteOps.map((op) => ({ workspaceId, systemId: op.systemId, body: op.body })));
  }
  if (plan.resourceOps.length > 0) {
    await tx.insert(systemResources).values(
      plan.resourceOps.map((op) => ({ workspaceId, systemId: op.systemId, kind: "repo" as const, label: "Repository", url: op.url })),
    );
  }
}
