"use client";

import { useActionState, useRef, useState } from "react";
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
import { alertBox, dangerButton, dangerSolidButton, secondaryButton } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// A destructive action behind a confirmation dialog (spec 0006, AC-6, AC-9, AC-12). The form posts the hidden
// fields to the server action and the dialog stays open while it runs, then closes. A refusal shows below the
// trigger and takes focus; otherwise focus goes back to the trigger.
export default function ConfirmSubmit({
  action,
  fields,
  triggerLabel,
  triggerAriaLabel,
  title,
  description,
  confirmLabel,
}: {
  action: Action;
  fields: Record<string, string>;
  triggerLabel: string;
  triggerAriaLabel?: string;
  title: string;
  description: string;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(async (prev, formData) => {
    // A redirect resolves with nothing; keep the previous state then.
    const result = (await action(prev, formData)) ?? prev;
    setOpen(false);
    return result;
  }, INITIAL_ACTION_STATE);

  return (
    <div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger className={dangerButton} aria-label={triggerAriaLabel}>
          {triggerLabel}
        </AlertDialogTrigger>
        <AlertDialogContent
          className="max-w-[calc(100%-2rem)] rounded-xl border-stone-300 bg-stone-100 text-stone-900 sm:max-w-lg dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          onCloseAutoFocus={(event) => {
            if (!state.ok) {
              event.preventDefault();
              messageRef.current?.focus();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600 dark:text-stone-300">{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <form action={formAction}>
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className={`${secondaryButton} mt-0`}>Cancel</AlertDialogCancel>
              <PendingButton className={dangerSolidButton}>{confirmLabel}</PendingButton>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
      {!state.ok && (
        <p ref={messageRef} role="alert" tabIndex={-1} className={`${alertBox} mt-3`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
