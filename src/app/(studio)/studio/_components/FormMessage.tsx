"use client";

import { useEffect, useRef } from "react";
import type { ActionState } from "@/studio/clients/action-state";
import { alertBox, textLink } from "./ui";

// The inline message for a failed action (spec 0006, AC-10 and AC-12): role="alert", focused on each new failure.
// A stale record also offers a Reload link back to the same edit page.
export default function FormMessage({ state, reloadHref }: { state: ActionState; reloadHref?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.ok) {
      ref.current?.focus();
    }
  }, [state]);

  if (state.ok) {
    return null;
  }
  return (
    <div ref={ref} role="alert" tabIndex={-1} className={alertBox}>
      {state.message}
      {state.code === "STALE_RECORD" && reloadHref && (
        <>
          {" "}
          <a href={reloadHref} className={textLink}>
            Reload
          </a>
        </>
      )}
    </div>
  );
}

const stateKeys = new WeakMap<ActionState, number>();
let lastKey = 0;

// A key that changes with each action result. React 19 resets a form after its action, and a <select> then falls
// back to its first option instead of the echoed value, so forms remount on each result to keep typed values.
export function stateKey(state: ActionState): number {
  let key = stateKeys.get(state);
  if (key === undefined) {
    key = ++lastKey;
    stateKeys.set(state, key);
  }
  return key;
}

// Typed values echoed back after a failure, else the record's own values.
export function valueOf(state: ActionState, initial: Record<string, string>, key: string): string {
  if (!state.ok && state.values) {
    return state.values[key] ?? "";
  }
  return initial[key] ?? "";
}

export function errorOf(state: ActionState, key: string): string | undefined {
  return state.ok ? undefined : state.fieldErrors?.[key];
}

