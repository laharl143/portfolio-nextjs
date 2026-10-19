"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SYSTEM_LINK_STATES } from "@/studio/db/constants";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { SelectField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { LINK_STATE_LABELS } from "./system-labels";
import { primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const STATE_OPTIONS = SYSTEM_LINK_STATES.map((value) => ({ value, label: LINK_STATE_LABELS[value] }));

// Add and edit a link this system sends (spec 0008, AC-5). The target is chosen only when adding.
export default function SystemLinkForm({
  action,
  initial,
  hidden,
  targets,
  submitLabel,
  cancelHref,
  reloadHref,
}: {
  action: Action;
  initial: Record<string, string>;
  hidden: Record<string, string>;
  targets?: { id: string; name: string }[];
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
      {targets && (
        <SelectField
          name="toSystemId"
          label="Sends to"
          required
          options={[{ value: "", label: "Choose a system" }, ...targets.map((t) => ({ value: t.id, label: t.name }))]}
          defaultValue={value("toSystemId")}
          error={errorOf(state, "toSystemId")}
        />
      )}
      <TextField name="label" label="Label" required maxLength={120} defaultValue={value("label")} error={errorOf(state, "label")} />
      <SelectField
        name="state"
        label="State"
        required
        options={STATE_OPTIONS}
        defaultValue={value("state") || "planned"}
        error={errorOf(state, "state")}
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
