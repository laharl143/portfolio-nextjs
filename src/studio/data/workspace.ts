import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import "@/studio/marker";
import { getStudioSession } from "@/studio/auth/session";

// The owner's workspace, inserted by migration 0002 (spec 0004, AC-2). A code constant, not a secret.
// Only scripts use it directly, through runInWorkspace(); request code gets the workspace from the session.
export const STUDIO_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

export class NoWorkspaceScope extends Error {
  constructor() {
    super("no workspace scope: call from guarded request code or inside runInWorkspace()");
    this.name = "NoWorkspaceScope";
  }
}

const scriptScope = new AsyncLocalStorage<string>();

// Scripts only (the seed). No page, layout, action, or data function calls this: a scoped call from
// request code would bypass the session (spec 0005, Key invariants).
export function runInWorkspace<T>(workspaceId: string, fn: () => Promise<T>): Promise<T> {
  return scriptScope.run(workspaceId, fn);
}

// Every top level insert and every read in the data layer scopes by this id (spec 0005, AC-11).
// Never falls back to a constant: with no script scope and no session it throws.
export async function getWorkspaceId(): Promise<string> {
  const scoped = scriptScope.getStore();
  if (scoped) {
    return scoped;
  }
  const session = await getStudioSession();
  if (!session) {
    throw new NoWorkspaceScope();
  }
  return session.workspaceId;
}
