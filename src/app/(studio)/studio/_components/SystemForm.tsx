"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SYSTEM_LAYERS, SYSTEM_LAYER_LABELS, SYSTEM_STATUSES } from "@/studio/db/constants";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { CheckboxField, SelectField, TextAreaField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { SYSTEM_STATUS_LABELS } from "./system-labels";
import { pageEyebrow, primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const STATUS_OPTIONS = SYSTEM_STATUSES.map((value) => ({ value, label: SYSTEM_STATUS_LABELS[value] }));
const LAYER_OPTIONS = SYSTEM_LAYERS.map((value) => ({ value, label: SYSTEM_LAYER_LABELS[value] }));

// Create and edit system (spec 0008, AC-3). The slug shows only on create; standalone is never typed.
export default function SystemForm({
  action,
  initial,
  hidden,
  withSlug,
  submitLabel,
  cancelHref,
  reloadHref,
}: {
  action: Action;
  initial: Record<string, string>;
  hidden: Record<string, string>;
  withSlug: boolean;
  submitLabel: string;
  cancelHref: string;
  reloadHref?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const value = (key: string) => valueOf(state, initial, key);

  return (
    <form key={stateKey(state)} action={formAction} noValidate className="grid max-w-2xl gap-5">
      {Object.entries(hidden).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <FormMessage state={state} reloadHref={reloadHref} />

      <fieldset className="grid gap-5">
        <legend className={`${pageEyebrow} mb-4`}>Public (what the export may publish)</legend>
        {withSlug && (
          <TextField
            name="slug"
            label="Slug"
            required
            maxLength={40}
            hint="Lowercase letters, digits, and hyphens. It is the public id and never changes."
            defaultValue={value("slug")}
            error={errorOf(state, "slug")}
          />
        )}
        <CheckboxField
          name="published"
          label="Published (the export includes this system)"
          defaultChecked={value("published") === "on"}
          error={errorOf(state, "published")}
        />
        <TextField name="name" label="Name" required maxLength={80} defaultValue={value("name")} error={errorOf(state, "name")} />
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            name="status"
            label="Status"
            required
            options={STATUS_OPTIONS}
            defaultValue={value("status") || "planned"}
            error={errorOf(state, "status")}
          />
          <SelectField
            name="layer"
            label="Layer"
            required
            hint="Standalone also marks it standalone on the public page."
            options={LAYER_OPTIONS}
            defaultValue={value("layer") || "core"}
            error={errorOf(state, "layer")}
          />
        </div>
        <TextAreaField
          name="publicSummary"
          label="Public summary"
          required
          maxLength={600}
          hint="Written for the public. No client names."
          defaultValue={value("publicSummary")}
          error={errorOf(state, "publicSummary")}
        />
        <TextField
          name="sortOrder"
          label="Sort order"
          required
          inputMode="numeric"
          hint="A whole number from -9999 to 9999. Lower comes first."
          defaultValue={value("sortOrder") || "0"}
          error={errorOf(state, "sortOrder")}
        />
      </fieldset>

      <fieldset className="mt-4 grid gap-5">
        <legend className={`${pageEyebrow} mb-4`}>Private, studio only</legend>
        <TextAreaField
          name="summary"
          label="Summary"
          maxLength={5000}
          defaultValue={value("summary")}
          error={errorOf(state, "summary")}
        />
        <TextAreaField
          name="lessons"
          label="Lessons"
          maxLength={5000}
          defaultValue={value("lessons")}
          error={errorOf(state, "lessons")}
        />
        <TextAreaField
          name="stack"
          label="Stack"
          hint="One item per line, at most 30 items of 60 characters."
          rows={5}
          defaultValue={value("stack")}
          error={errorOf(state, "stack")}
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <PendingButton className={primaryButton}>{submitLabel}</PendingButton>
        <Link href={cancelHref} className={textLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
