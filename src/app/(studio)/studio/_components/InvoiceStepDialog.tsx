"use client";

import Link from "next/link";
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
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/studio/db/constants";
import PendingButton from "./PendingButton";
import {
  alertBox,
  dangerButton,
  dangerSolidButton,
  fieldError,
  input,
  label,
  primaryButton,
  secondaryButton,
  textLink,
  textarea,
} from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
export type InvoiceStepKind = "send" | "paid" | "undo" | "void";

const STEPS: Record<InvoiceStepKind, { label: string; description: string; danger?: boolean }> = {
  send: {
    label: "Mark sent",
    description:
      "The invoice takes the next number for the year, its issue and due dates are fixed, and the PDF is saved. Every later download returns that exact file, and the invoice can no longer be edited.",
  },
  paid: { label: "Mark paid", description: "Records the payment. You can undo this if it was a mistake." },
  undo: { label: "Undo paid", description: "Moves the invoice back to sent and clears the payment details." },
  void: {
    label: "Void invoice",
    description: "The invoice keeps its number and its PDF but is marked Void. This cannot be undone.",
    danger: true,
  },
};

const optional = <span className="font-normal text-stone-500 dark:text-stone-400"> (optional)</span>;

function Field({
  id,
  name,
  text,
  required,
  error,
  children,
}: {
  id: string;
  name: string;
  text: string;
  required?: boolean;
  error?: string;
  children: (props: { id: string; name: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
        {!required && optional}
      </label>
      {children({
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && (
        <p id={`${id}-error`} role="alert" className={fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

// One invoice step behind a confirmation dialog (spec 0013, AC-7 and AC-9). The dialog stays open on a refusal and
// shows why; success redirects. "Mark paid" asks for the payment details, "Void invoice" for a reason.
export default function InvoiceStepDialog({
  kind,
  action,
  fields,
  today,
  profileHref,
}: {
  kind: InvoiceStepKind;
  action: Action;
  fields: Record<string, string>;
  // YYYY-MM-DD in Asia/Manila, the paid date's default and its latest allowed value.
  today: string;
  profileHref: string;
}) {
  const step = STEPS[kind];
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (prev, formData) => (await action(prev, formData)) ?? prev,
    INITIAL_ACTION_STATE,
  );
  const failed = !state.ok;
  const errors = failed ? (state.fieldErrors ?? {}) : {};
  const echoed = (key: string, fallback = "") => (failed ? (state.values?.[key] ?? fallback) : fallback);
  const id = (name: string) => `${kind}-${name}`;
  const hasFieldError = Object.keys(errors).length > 0;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger className={step.danger ? dangerButton : kind === "send" ? primaryButton : secondaryButton}>
        {step.label}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-stone-300 bg-stone-100 text-stone-900 sm:max-w-lg dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
        <AlertDialogHeader>
          <AlertDialogTitle>{step.label}?</AlertDialogTitle>
          <AlertDialogDescription className="text-stone-600 dark:text-stone-300">{step.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form key={failed ? JSON.stringify(state) : "fresh"} action={formAction} noValidate className="grid gap-4">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {failed && !hasFieldError && (
            <p role="alert" className={alertBox}>
              {state.message}
              {state.code === "BILLING_PROFILE_MISSING" && (
                <>
                  {" "}
                  <Link href={profileHref} className={textLink}>
                    Open the billing profile
                  </Link>
                </>
              )}
            </p>
          )}
          {kind === "paid" && (
            <>
              <Field id={id("paid-on")} name="paidOn" text="Paid date" required error={errors.paidOn}>
                {(props) => (
                  <input type="date" max={today} defaultValue={echoed("paidOn", today)} className={input} {...props} />
                )}
              </Field>
              <Field id={id("method")} name="paymentMethod" text="Method" error={errors.paymentMethod}>
                {(props) => (
                  <select defaultValue={echoed("paymentMethod")} className={input} {...props}>
                    <option value="">Not recorded</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field id={id("reference")} name="paymentReference" text="Reference" error={errors.paymentReference}>
                {(props) => (
                  <input maxLength={200} autoComplete="off" defaultValue={echoed("paymentReference")} className={input} {...props} />
                )}
              </Field>
            </>
          )}
          {kind !== "send" && (
            <Field
              id={id("note")}
              name="note"
              text={kind === "void" ? "Reason" : "Note"}
              required={kind === "void"}
              error={errors.note}
            >
              {(props) => <textarea maxLength={1000} rows={3} defaultValue={echoed("note")} className={textarea} {...props} />}
            </Field>
          )}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className={`${secondaryButton} mt-0`}>Cancel</AlertDialogCancel>
            <PendingButton className={step.danger ? dangerSolidButton : primaryButton}>{step.label}</PendingButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
