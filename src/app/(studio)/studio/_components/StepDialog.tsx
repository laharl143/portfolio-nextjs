"use client";

import { useActionState, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import PendingButton from "./PendingButton";
import SignedCopyInput from "./SignedCopyInput";
import { alertBox, dangerButton, dangerSolidButton, fieldError, label, primaryButton, secondaryButton, textarea } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// One contract status step behind a confirmation dialog with an optional note (spec 0007, AC-7), and for "Mark
// signed" an optional signed copy (AC-8). The dialog stays open on a refusal and shows why; success redirects.
export default function StepDialog({
  action,
  fields,
  triggerLabel,
  title,
  description,
  confirmLabel,
  withFile = false,
  danger = false,
}: {
  action: Action;
  fields: Record<string, string>;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  withFile?: boolean;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [fileTooBig, setFileTooBig] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (prev, formData) => (await action(prev, formData)) ?? prev,
    INITIAL_ACTION_STATE,
  );
  const failed = !state.ok;
  const noteError = failed ? state.fieldErrors?.note : undefined;
  const fileError = failed ? state.fieldErrors?.signedCopy : undefined;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger className={danger ? dangerButton : secondaryButton}>{triggerLabel}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-xl border-stone-300 bg-stone-100 text-stone-900 sm:max-w-lg dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-stone-600 dark:text-stone-300">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction} className="grid gap-4">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {failed && !noteError && !fileError && (
            <p role="alert" className={alertBox}>
              {state.message}
            </p>
          )}
          <div>
            <label htmlFor={`note-${fields.to}`} className={label}>
              Note <span className="font-normal text-stone-500 dark:text-stone-400">(optional)</span>
            </label>
            <textarea
              id={`note-${fields.to}`}
              name="note"
              maxLength={1000}
              rows={3}
              defaultValue={failed ? (state.values?.note ?? "") : ""}
              aria-invalid={noteError ? true : undefined}
              aria-describedby={noteError ? `note-${fields.to}-error` : undefined}
              className={textarea}
            />
            {noteError && (
              <p id={`note-${fields.to}-error`} role="alert" className={fieldError}>
                {noteError}
              </p>
            )}
          </div>
          {withFile && (
            <SignedCopyInput id={`signed-copy-${fields.to}`} serverError={fileError} onTooBig={setFileTooBig} />
          )}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className={`${secondaryButton} mt-0`}>Cancel</AlertDialogCancel>
            {fileTooBig ? (
              <button type="button" disabled className={danger ? dangerSolidButton : primaryButton}>
                {confirmLabel}
              </button>
            ) : (
              <PendingButton className={danger ? dangerSolidButton : primaryButton}>{confirmLabel}</PendingButton>
            )}
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
