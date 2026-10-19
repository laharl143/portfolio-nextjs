import "server-only";
import "@/studio/marker";

// The owner's workspace, inserted by migration 0002 (spec 0004, AC-2). A code constant, not a secret.
export const STUDIO_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

// Every top level insert and every read in the data layer scopes by this id.
// Feature 21 (studio login) swaps the body for a lookup of the signed in session's workspace.
export async function getWorkspaceId(): Promise<string> {
  return STUDIO_WORKSPACE_ID;
}
