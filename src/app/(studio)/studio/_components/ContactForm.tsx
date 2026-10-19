"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CONTACT_CHANNELS } from "@/studio/db/constants";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { statusLabel } from "@/studio/format";
import { CheckboxField, SelectField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const CHANNEL_OPTIONS = [
  { value: "", label: "No preference" },
  ...CONTACT_CHANNELS.map((value) => ({ value, label: statusLabel(value) })),
];

// Add and edit contact (spec 0006, AC-7). `initial.isPrimary` is "on" when the box starts ticked.
export default function ContactForm({
  action,
  initial,
  hidden,
  submitLabel,
  cancelHref,
  reloadHref,
}: {
  action: Action;
  initial: Record<string, string>;
  hidden: Record<string, string>;
  submitLabel: string;
  cancelHref: string;
  reloadHref?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const value = (key: string) => valueOf(state, initial, key);

  return (
    <form key={stateKey(state)} action={formAction} noValidate className="grid max-w-xl gap-5">
      {Object.entries(hidden).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <FormMessage state={state} reloadHref={reloadHref} />
      <TextField
        name="fullName"
        label="Full name"
        required
        maxLength={200}
        defaultValue={value("fullName")}
        error={errorOf(state, "fullName")}
      />
      <TextField
        name="email"
        label="Email"
        type="email"
        maxLength={320}
        defaultValue={value("email")}
        error={errorOf(state, "email")}
      />
      <TextField name="phone" label="Phone" type="tel" maxLength={50} defaultValue={value("phone")} error={errorOf(state, "phone")} />
      <SelectField
        name="preferredChannel"
        label="Preferred channel"
        options={CHANNEL_OPTIONS}
        defaultValue={value("preferredChannel")}
        error={errorOf(state, "preferredChannel")}
      />
      <CheckboxField
        name="isPrimary"
        label="Primary contact"
        defaultChecked={value("isPrimary") === "on"}
        error={errorOf(state, "isPrimary")}
      />
      <div className="flex flex-wrap items-center gap-4">
        <PendingButton className={primaryButton}>{submitLabel}</PendingButton>
        <Link href={cancelHref} className={textLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
