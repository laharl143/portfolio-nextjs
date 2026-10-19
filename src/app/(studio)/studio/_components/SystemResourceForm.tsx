"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SYSTEM_RESOURCE_KINDS } from "@/studio/db/constants";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { SelectField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { RESOURCE_KIND_LABELS } from "./system-labels";
import { primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const KIND_OPTIONS = SYSTEM_RESOURCE_KINDS.map((value) => ({ value, label: RESOURCE_KIND_LABELS[value] }));

// Add and edit a private resource link (spec 0008, AC-6).
export default function SystemResourceForm({
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
      <SelectField
        name="kind"
        label="Kind"
        required
        options={KIND_OPTIONS}
        defaultValue={value("kind") || "repo"}
        error={errorOf(state, "kind")}
      />
      <TextField name="label" label="Label" required maxLength={120} defaultValue={value("label")} error={errorOf(state, "label")} />
      <TextField
        name="url"
        label="URL"
        type="url"
        required
        maxLength={2048}
        hint="Starts with http:// or https://."
        defaultValue={value("url")}
        error={errorOf(state, "url")}
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
