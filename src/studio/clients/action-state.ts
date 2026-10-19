// What every client tracking server action returns (spec 0006, API surface). Plain types and constants only,
// so the studio's client forms can import it. Typed values come back only inside `values`, never logged.
export type ActionState =
  | { ok: true }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string>; values?: Record<string, string> };

export const INITIAL_ACTION_STATE: ActionState = { ok: true };
