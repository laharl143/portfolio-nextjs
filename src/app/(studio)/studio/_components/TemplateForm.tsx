"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import ContractBody from "./ContractBody";
import { TextAreaField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import PlaceholderList from "./PlaceholderList";
import { card, primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// New and edit template (spec 0007, AC-1): the body editor beside the placeholder list and a live formatted preview.
export default function TemplateForm({
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
    <BodyEditorForm key={stateKey(state)} initialBody={value("body")}>
      {(body, setBody) => (
        <form action={formAction} noValidate className="grid gap-5">
          {Object.entries(hidden).map(([name, v]) => (
            <input key={name} type="hidden" name={name} value={v} />
          ))}
          <div className="max-w-xl">
            <FormMessage state={state} reloadHref={reloadHref} />
          </div>
          <div className="grid max-w-xl gap-5">
            <TextField name="name" label="Name" required maxLength={200} defaultValue={value("name")} error={errorOf(state, "name")} />
            <TextAreaField
              name="description"
              label="Description"
              maxLength={500}
              rows={2}
              defaultValue={value("description")}
              error={errorOf(state, "description")}
            />
          </div>
          <BodyEditor body={body} setBody={setBody} error={errorOf(state, "body")} required label="Template text" />
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

// Holds the body text so the preview follows every keystroke; remounted (with the echoed body) on each action result.
export function BodyEditorForm({
  initialBody,
  children,
}: {
  initialBody: string;
  children: (body: string, setBody: (value: string) => void) => React.ReactNode;
}) {
  const [body, setBody] = useState(initialBody);
  return <>{children(body, setBody)}</>;
}

export function BodyEditor({
  body,
  setBody,
  error,
  required,
  label,
  values,
}: {
  body: string;
  setBody: (value: string) => void;
  error?: string;
  required?: boolean;
  label: string;
  values?: Parameters<typeof ContractBody>[0]["values"];
}) {
  const describedBy = ["body-help", error ? "body-error" : ""].filter(Boolean).join(" ");
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="min-w-0">
        <label htmlFor="body" className="text-sm font-semibold">
          {label}
          {!required && <span className="font-normal text-stone-500 dark:text-stone-400"> (optional)</span>}
        </label>
        <textarea
          id="body"
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={50000}
          rows={18}
          spellCheck
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="mt-1.5 block w-full rounded-lg border border-stone-400 bg-white px-3 py-2 font-mono text-sm text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 aria-[invalid=true]:border-red-600 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:aria-[invalid=true]:border-red-400"
        />
        <p id="body-help" className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          # heading, **bold**, *italic*, - bullets, 1. numbered, and a line of --- for a page break.{" "}
          {body.length.toLocaleString("en-US")} of 50,000 characters.
        </p>
        {error && (
          <p id="body-error" className="mt-1 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
        <PlaceholderList />
      </div>
      <section aria-label="Preview" className={`${card} min-w-0 p-5`}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500">Preview</p>
        <ContractBody body={body} values={values} />
      </section>
    </div>
  );
}
