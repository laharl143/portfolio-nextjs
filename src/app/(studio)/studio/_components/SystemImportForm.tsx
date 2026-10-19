"use client";

import { useActionState, useState } from "react";
import {
  INITIAL_IMPORT_STATE,
  type ImportCount,
  type ImportPlanRow,
  type ImportState,
} from "@/studio/systems/import-state";
import { useFormStatus } from "react-dom";
import FormMessage, { stateKey } from "./FormMessage";
import { card, fieldError, hint, label, primaryButton, secondaryButton, textarea } from "./ui";

type Action = (prev: ImportState, formData: FormData) => Promise<ImportState>;

const ACTION_LABELS: Record<ImportPlanRow["action"], string> = {
  create: "Create",
  update: "Update",
  unchanged: "Unchanged",
  skipped: "Skipped (archived)",
  error: "Error",
};

const ACTION_TONES: Record<ImportPlanRow["action"], string> = {
  create: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  update: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  unchanged: "bg-stone-300 text-stone-800 dark:bg-stone-700 dark:text-stone-200",
  skipped: "bg-stone-300 text-stone-800 dark:bg-stone-700 dark:text-stone-200",
  error: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

const tag = "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold";

function PlanList({ title, rows }: { title: string; rows: ImportPlanRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-lg font-semibold">
        {title} <span className="text-sm font-normal text-stone-500 dark:text-stone-400">({rows.length})</span>
      </h3>
      <ul className={`${card} divide-y divide-stone-300 text-sm dark:divide-stone-700`}>
        {rows.map((row) => (
          <li key={row.path} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${tag} ${ACTION_TONES[row.action]}`}>{ACTION_LABELS[row.action]}</span>
              {row.public && (
                <span className={`${tag} bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200`}>Public</span>
              )}
              <span className="break-all font-semibold">{row.key}</span>
              <span className="text-xs text-stone-500 dark:text-stone-400">{row.path}</span>
            </div>
            {row.fields && row.fields.length > 0 && <p>Changes: {row.fields.join(", ")}</p>}
            {row.extras && row.extras.length > 0 && row.action !== "skipped" && (
              <p className="text-stone-600 dark:text-stone-300">{row.extras.join(" · ")}</p>
            )}
            {row.errors?.map((error) => (
              <p key={error} className="break-words text-red-700 dark:text-red-400">
                {error}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CountLine({ name, count }: { name: string; count: ImportCount }) {
  return (
    <li>
      <span className="font-semibold">{name}:</span> {count.created} created, {count.updated} updated, {count.unchanged}{" "}
      unchanged, {count.skipped} skipped
    </li>
  );
}

function SubmitButton({ intent, disabled, className, children }: { intent: string; disabled?: boolean; className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="intent" value={intent} disabled={disabled || pending} aria-disabled={disabled || pending} className={className}>
      {children}
    </button>
  );
}

// The paste in import (spec 0008, AC-7). Import stays disabled until a preview of exactly this text has no errors.
export default function SystemImportForm({ preview, apply }: { preview: Action; apply: Action }) {
  const [dirty, setDirty] = useState(false);
  const [state, formAction] = useActionState<ImportState, FormData>(async (prev, formData) => {
    const next = await (formData.get("intent") === "apply" ? apply(prev, formData) : preview(prev, formData));
    setDirty(false);
    return next;
  }, INITIAL_IMPORT_STATE);

  const json = state.values?.json ?? "";
  const previewClean = state.stage === "preview" && state.ok && (state.errorCount ?? 0) === 0 && !dirty;
  const rows = state.plan ?? [];
  const jsonError = !state.ok ? state.fieldErrors?.json : undefined;

  return (
    <form key={stateKey(state)} action={formAction} noValidate className="grid gap-5">
      <FormMessage state={state} />
      {state.stage === "applied" && state.counts && (
        <div role="status" className={`${card} p-4 text-sm`}>
          <p className="font-semibold">Import finished</p>
          <ul className="mt-2 space-y-1">
            <CountLine name="Systems" count={state.counts.systems} />
            <CountLine name="Links" count={state.counts.links} />
            <CountLine name="Notes" count={state.counts.notes} />
            <CountLine name="Resources" count={state.counts.resources} />
          </ul>
        </div>
      )}
      <div>
        <label htmlFor="json" className={label}>
          Exported JSON
        </label>
        <textarea
          id="json"
          name="json"
          rows={14}
          defaultValue={json}
          spellCheck={false}
          onChange={() => setDirty(true)}
          aria-invalid={jsonError ? true : undefined}
          aria-describedby={jsonError ? "json-hint json-error" : "json-hint"}
          className={`${textarea} font-mono text-xs`}
        />
        <p id="json-hint" className={hint}>
          {'{ "systems": [...], "links": [...] }, at most 256 KB. It stays in your browser and the database; never commit it.'}
        </p>
        {jsonError && (
          <p id="json-error" className={fieldError}>
            {jsonError}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton intent="preview" className={secondaryButton}>
          Preview
        </SubmitButton>
        <SubmitButton intent="apply" disabled={!previewClean} className={primaryButton}>
          Import
        </SubmitButton>
        {!previewClean && <span className={hint}>Preview with no errors first.</span>}
      </div>

      {rows.length > 0 && (
        <div aria-live="polite">
          <PlanList title="Systems" rows={rows.filter((row) => row.entity === "system")} />
          <PlanList title="Links" rows={rows.filter((row) => row.entity === "link")} />
        </div>
      )}
    </form>
  );
}
