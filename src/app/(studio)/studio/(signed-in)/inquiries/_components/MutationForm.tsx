"use client";
import { useActionState } from "react";
import type { ActionState } from "@/studio/clients/action-state";
import { primaryButton, alertBox } from "../../../_components/ui";
export default function MutationForm({
  action,
  children,
  label,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  label: string;
}) {
  const [state, submit, pending] = useActionState(action, {
    ok: true,
  } as ActionState);
  return (
    <form action={submit} className="space-y-3">
      {children}
      {!state.ok && (
        <p role="alert" className={alertBox}>
          {state.message} ({state.code})
        </p>
      )}
      <button disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : label}
      </button>
    </form>
  );
}
