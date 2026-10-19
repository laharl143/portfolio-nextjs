"use client";

import Link from "next/link";
import { useActionState } from "react";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { TextAreaField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// The add note box on the detail page and the edit note page (spec 0006, AC-9). With no cancelHref it is the add
// box: after { ok: true } React resets the form, and with no echoed values the box comes back empty.
export default function NoteForm({
  action,
  initial = {},
  hidden,
  submitLabel,
  cancelHref,
  reloadHref,
  label = "Note",
}: {
  action: Action;
  initial?: Record<string, string>;
  hidden: Record<string, string>;
  submitLabel: string;
  cancelHref?: string;
  reloadHref?: string;
  label?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);

  return (
    <form key={stateKey(state)} action={formAction} noValidate className="grid gap-4">
      {Object.entries(hidden).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <FormMessage state={state} reloadHref={reloadHref} />
      <TextAreaField
        name="body"
        label={label}
        required
        maxLength={10000}
        rows={cancelHref ? 10 : 4}
        defaultValue={valueOf(state, initial, "body")}
        error={errorOf(state, "body")}
      />
      <div className="flex flex-wrap items-center gap-4">
        <PendingButton className={primaryButton}>{submitLabel}</PendingButton>
        {cancelHref && (
          <Link href={cancelHref} className={textLink}>
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
