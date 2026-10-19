"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CLIENT_STATUSES } from "@/studio/db/constants";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { statusLabel } from "@/studio/format";
import { SelectField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const STATUS_OPTIONS = CLIENT_STATUSES.map((value) => ({ value, label: statusLabel(value) }));

// Create and edit client (spec 0006, AC-4 and AC-5). Edit passes clientId and version as hidden fields.
export default function ClientForm({
  action,
  initial,
  hidden = {},
  submitLabel,
  cancelHref,
  reloadHref,
}: {
  action: Action;
  initial: Record<string, string>;
  hidden?: Record<string, string>;
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
      <TextField name="name" label="Name" required maxLength={200} defaultValue={value("name")} error={errorOf(state, "name")} />
      <SelectField
        name="status"
        label="Status"
        required
        options={STATUS_OPTIONS}
        defaultValue={value("status") || "lead"}
        error={errorOf(state, "status")}
      />
      <TextField
        name="website"
        label="Website"
        type="text"
        inputMode="url"
        hint="https:// is added if you leave it out."
        defaultValue={value("website")}
        error={errorOf(state, "website")}
      />
      <TextField name="industry" label="Industry" maxLength={100} defaultValue={value("industry")} error={errorOf(state, "industry")} />
      <div className="flex flex-wrap items-center gap-4">
        <PendingButton className={primaryButton}>{submitLabel}</PendingButton>
        <Link href={cancelHref} className={textLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
