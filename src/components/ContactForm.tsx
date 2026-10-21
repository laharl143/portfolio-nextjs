"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { contactData } from "../../utils/data/contact-data";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
const fieldClass =
  "mt-2 block w-full rounded-lg border border-stone-400 bg-white p-3 text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100";
export default function ContactForm({
  enabled,
  siteKey,
}: {
  enabled: boolean;
  siteKey: string;
}) {
  const [ready, setReady] = useState(false),
    [token, setToken] = useState(""),
    [pending, setPending] = useState(false),
    [success, setSuccess] = useState(false),
    [message, setMessage] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [frozen, setFrozen] = useState(false);
  const form = useRef<HTMLFormElement>(null),
    widget = useRef<HTMLDivElement>(null),
    widgetId = useRef<string>(undefined),
    key = useRef<string>(undefined),
    summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      !ready ||
      !widget.current ||
      !window.turnstile ||
      !enabled ||
      !siteKey ||
      success
    )
      return;
    widgetId.current = window.turnstile.render(widget.current, {
      sitekey: siteKey,
      action: "lead_intake",
      callback: (value: string) => setToken(value),
      "expired-callback": () => setToken(""),
      "error-callback": () => {
        setToken("");
        setMessage("The challenge is unavailable. You can use email below.");
      },
    });
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
    };
  }, [ready, enabled, siteKey, success]);
  function resetChallenge() {
    setToken("");
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }
  function newDraft() {
    key.current = undefined;
    setFrozen(false);
    setSuccess(false);
    setMessage("");
    setErrors({});
    resetChallenge();
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    key.current ??= crypto.randomUUID();
    setPending(true);
    setMessage("");
    setErrors({});
    setFrozen(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionKey: key.current,
          name: data.get("name"),
          email: data.get("email"),
          description: data.get("description"),
          company: data.get("company"),
          budget: data.get("budget"),
          acknowledged: data.get("acknowledged") === "on",
          noticeVersion: contactData.noticeVersion,
          challengeToken: token,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(
          response.status === 422
            ? "Check the fields below. Choose Edit draft to change them."
            : response.status === 429
              ? "Too many requests. Please try again later."
              : "Your inquiry could not be confirmed. Retry this draft, or use email.",
        );
        resetChallenge();
      } else {
        setSuccess(true);
        setFrozen(false);
        key.current = undefined;
        form.current?.reset();
        setMessage(contactData.success);
      }
    } catch {
      setMessage(
        "Your inquiry could not be confirmed. Retry this draft to avoid a duplicate.",
      );
      resetChallenge();
    } finally {
      setPending(false);
      requestAnimationFrame(() => summary.current?.focus());
    }
  }
  if (!enabled || !siteKey)
    return (
      <p className="rounded-xl border border-stone-400 p-6">
        The inquiry form is currently unavailable.{" "}
        <a className="underline" href={`mailto:${contactData.email}`}>
          Send me an email
        </a>
        .
      </p>
    );
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() =>
          setMessage("The challenge could not load. You can use email below.")
        }
      />
      <div
        ref={summary}
        tabIndex={-1}
        role={success ? "status" : "alert"}
        className={
          message
            ? "mb-6 rounded-lg border border-stone-400 p-4 focus:outline-none focus:ring-2 focus:ring-red-orange-500"
            : ""
        }
      >
        {message}
      </div>
      {success ? (
        <button type="button" className={fieldClass} onClick={newDraft}>
          Start another inquiry
        </button>
      ) : (
        <form ref={form} onSubmit={submit} className="space-y-6">
          <p className="text-sm">
            Name, email, and project description are required.
          </p>
          {(
            [
              { name: "name", label: "Name", max: 200, required: true },
              { name: "email", label: "Email", max: 320, required: true },
              { name: "company", label: "Company (optional)", max: 200 },
              { name: "budget", label: "Budget (optional)", max: 200 },
              {
                name: "description",
                label: "Project description",
                max: 5000,
                required: true,
              },
            ] as const
          ).map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="font-semibold">
                {field.label}
              </label>
              {field.name === "description" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  minLength={20}
                  maxLength={field.max}
                  required
                  readOnly={frozen}
                  aria-invalid={!!errors[field.name]}
                  aria-describedby={
                    errors[field.name] ? `${field.name}-error` : undefined
                  }
                  className={`${fieldClass} min-h-40`}
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.name === "email" ? "email" : "text"}
                  maxLength={field.max}
                  required={"required" in field && field.required}
                  readOnly={frozen}
                  autoComplete={
                    field.name === "name"
                      ? "name"
                      : field.name === "email"
                        ? "email"
                        : field.name === "company"
                          ? "organization"
                          : "off"
                  }
                  aria-invalid={!!errors[field.name]}
                  aria-describedby={
                    errors[field.name] ? `${field.name}-error` : undefined
                  }
                  className={fieldClass}
                />
              )}
              {errors[field.name] && (
                <p
                  id={`${field.name}-error`}
                  className="mt-1 text-sm text-red-700 dark:text-red-400"
                >
                  {errors[field.name]}
                </p>
              )}
            </div>
          ))}
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {contactData.privacy}
          </p>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="acknowledged"
              required
              onClick={(event) => {
                if (frozen) event.preventDefault();
              }}
              className="mt-1 size-5 shrink-0"
            />
            <span>
              I acknowledge how my inquiry details will be used and retained.
            </span>
          </label>
          {errors.acknowledged && (
            <p className="text-red-700 dark:text-red-400">
              {errors.acknowledged}
            </p>
          )}
          <div ref={widget} className="min-h-16" />
          {!ready && (
            <p className="text-sm">
              Loading the challenge. If it is unavailable, use email below.
            </p>
          )}
          <button
            disabled={pending || !token}
            className="rounded-lg bg-stone-900 px-6 py-3 font-semibold text-white focus-visible:ring-2 focus-visible:ring-red-orange-500 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
          >
            {pending
              ? "Sending…"
              : frozen
                ? "Retry this draft"
                : "Send inquiry"}
          </button>
          {frozen && !pending && (
            <button type="button" onClick={newDraft} className="ml-4 underline">
              Edit draft (new submission)
            </button>
          )}
        </form>
      )}
      <noscript>
        <p>
          JavaScript is needed for the bot challenge.{" "}
          <a href={`mailto:${contactData.email}`}>Send an email instead</a>.
        </p>
      </noscript>
    </>
  );
}
