"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PROJECT_STATUSES } from "@/studio/db/constants";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { statusLabel } from "@/studio/format";
import { SelectField, TextAreaField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const STATUS_OPTIONS = PROJECT_STATUSES.map((value) => ({ value, label: statusLabel(value) }));

// Add and edit project (spec 0006, AC-8).
export default function ProjectForm({
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
      <TextField name="name" label="Name" required maxLength={200} defaultValue={value("name")} error={errorOf(state, "name")} />
      <SelectField
        name="status"
        label="Status"
        required
        options={STATUS_OPTIONS}
        defaultValue={value("status") || "planned"}
        error={errorOf(state, "status")}
      />
      <TextAreaField
        name="description"
        label="Description"
        maxLength={5000}
        defaultValue={value("description")}
        error={errorOf(state, "description")}
      />
      <div className="grid gap-5 md:grid-cols-3">
        <TextField name="startDate" label="Start date" type="date" defaultValue={value("startDate")} error={errorOf(state, "startDate")} />
        <TextField
          name="targetEndDate"
          label="Target end date"
          type="date"
          defaultValue={value("targetEndDate")}
          error={errorOf(state, "targetEndDate")}
        />
        <TextField
          name="actualEndDate"
          label="Actual end date"
          type="date"
          hint="Only when done or cancelled."
          defaultValue={value("actualEndDate")}
          error={errorOf(state, "actualEndDate")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <PendingButton className={primaryButton}>{submitLabel}</PendingButton>
        <Link href={cancelHref} className={textLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
