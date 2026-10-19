"use client";

import Link from "next/link";
import { useActionState } from "react";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import type { PlaceholderValues } from "@/studio/contracts/placeholders";
import { BILLING_CADENCES } from "@/studio/db/constants";
import { statusLabel } from "@/studio/format";
import { SelectField, TextAreaField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { BodyEditor, BodyEditorForm } from "./TemplateForm";
import { primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type Option = { value: string; label: string };

const CADENCE_OPTIONS: Option[] = [
  { value: "", label: "Not set" },
  ...BILLING_CADENCES.map((value) => ({ value, label: statusLabel(value) })),
];

// New contract (with the template picker) and edit draft contract (with the body editor), spec 0007, AC-2 and AC-4.
export default function ContractForm({
  action,
  initial,
  hidden,
  projects,
  templates,
  values,
  submitLabel,
  cancelHref,
  reloadHref,
}: {
  action: Action;
  initial: Record<string, string>;
  hidden: Record<string, string>;
  projects: Option[];
  // Only on the new form.
  templates?: Option[];
  // Only on the edit form: the saved values the preview fills in.
  values?: PlaceholderValues;
  submitLabel: string;
  cancelHref: string;
  reloadHref?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const value = (key: string) => valueOf(state, initial, key);
  const editing = templates === undefined;

  const fields = (
    <div className="grid max-w-xl gap-5">
      {templates && (
        <SelectField
          name="templateId"
          label="Template"
          required
          options={[{ value: "", label: "Choose a template" }, ...templates, { value: "blank", label: "Blank" }]}
          defaultValue={value("templateId")}
          error={errorOf(state, "templateId")}
        />
      )}
      <TextField name="title" label="Title" required maxLength={200} defaultValue={value("title")} error={errorOf(state, "title")} />
      <SelectField
        name="projectId"
        label="Project"
        options={[{ value: "", label: "No project" }, ...projects]}
        defaultValue={value("projectId")}
        error={errorOf(state, "projectId")}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          name="amount"
          label="Amount (PHP)"
          inputMode="decimal"
          maxLength={20}
          hint="Pesos, like 12,500.00"
          defaultValue={value("amount")}
          error={errorOf(state, "amount")}
        />
        <SelectField
          name="billingCadence"
          label="Billing"
          options={CADENCE_OPTIONS}
          defaultValue={value("billingCadence")}
          error={errorOf(state, "billingCadence")}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField name="startDate" label="Start date" type="date" defaultValue={value("startDate")} error={errorOf(state, "startDate")} />
        <TextField name="endDate" label="End date" type="date" defaultValue={value("endDate")} error={errorOf(state, "endDate")} />
      </div>
      <TextAreaField
        name="termsSummary"
        label="Terms summary"
        maxLength={2000}
        defaultValue={value("termsSummary")}
        error={errorOf(state, "termsSummary")}
      />
    </div>
  );

  return (
    <BodyEditorForm key={stateKey(state)} initialBody={value("body")}>
      {(body, setBody) => (
        <form action={formAction} noValidate className="grid gap-5">
          {Object.entries(hidden).map(([name, v]) => (
            <input key={name} type="hidden" name={name} value={v} />
          ))}
          <div className="max-w-xl">
            <FormMessage state={state} reloadHref={reloadHref} />
          </div>
          {fields}
          {editing && (
            <BodyEditor body={body} setBody={setBody} error={errorOf(state, "body")} label="Contract text" values={values} />
          )}
          <div className="flex flex-wrap items-center gap-4">
            <PendingButton className={primaryButton}>{submitLabel}</PendingButton>
            <Link href={cancelHref} className={textLink}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </BodyEditorForm>
  );
}
