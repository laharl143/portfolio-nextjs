import type { ActionState } from "@/studio/clients/action-state";

// The import page's action state (spec 0008, API surface). Plain types only, so the client form can import them.
// The pasted JSON comes back only inside `values.json` (so the textarea survives) and is never logged.

export type ImportRowAction = "create" | "update" | "unchanged" | "skipped" | "error";

export type ImportPlanRow = {
  entity: "system" | "link";
  // `systems[3]` or `links[0]`.
  path: string;
  // The system id, or `from → to`.
  key: string;
  action: ImportRowAction;
  // Update: the fields that change.
  fields?: string[];
  // True when an update touches a public field.
  public?: boolean;
  // System rows: what happens to its note and repo resource.
  extras?: string[];
  errors?: string[];
};

export type ImportCount = { created: number; updated: number; unchanged: number; skipped: number };
export type ImportCounts = { systems: ImportCount; links: ImportCount; notes: ImportCount; resources: ImportCount };

export type ImportState = ActionState & {
  values?: Record<string, string>;
  stage?: "preview" | "applied";
  plan?: ImportPlanRow[];
  errorCount?: number;
  counts?: ImportCounts;
};

export const INITIAL_IMPORT_STATE: ImportState = { ok: true };

export const IMPORT_MAX_BYTES = 256 * 1024;
