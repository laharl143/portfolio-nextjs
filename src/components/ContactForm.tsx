"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { contactData } from "../../utils/data/contact-data";
import {
  forgetContactLocation,
  readContactLocation,
  type ContactLocation,
} from "@/lib/contact-location";
import {
  trackInquiryFailed,
  trackInquiryStart,
  trackInquirySent,
  type InquiryFailure,
} from "@/lib/analytics";

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
// The fields whose first edit counts as a form start; the hidden Turnstile input is not one (spec 0020, AC-3).
const DRAFT_FIELDS = new Set(["name", "email", "company", "budget", "description", "acknowledged"]);
// Classified by status before the body is read, so an unreadable body never changes the reason (AC-4, AC-5).
const failureReason = (status: number): InquiryFailure =>
  status === 422
    ? "validation"
    : status === 403
      ? "challenge"
      : status === 429
        ? "rate_limited"
        : "server";
const fieldClass =
  "mt-2 block w-full rounded-lg border border-border bg-card p-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
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
    summary = useRef<HTMLDivElement>(null),
    // Read once on mount, so a later click in this tab mid draft never changes it; never rendered (spec 0020, AC-2).
    source = useRef<ContactLocation | null>(null),
    started = useRef(false);
  useEffect(() => {
    source.current = readContactLocation();
  }, []);
  const eventLocation = () => source.current ?? "direct";
  function startDraft(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement;
    if (started.current || !DRAFT_FIELDS.has(target.name)) return;
    started.current = true;
    trackInquiryStart(eventLocation());
  }
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
  // Only "Start another inquiry" restarts the funnel; "Edit draft" keeps the same started draft (AC-3).
  function newDraft({ restart = false }: { restart?: boolean } = {}) {
    if (restart) started.current = false;
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
          ...(source.current && { sourceLocation: source.current }),
        }),
      });
      if (!response.ok) trackInquiryFailed(eventLocation(), failureReason(response.status));
      else {
        trackInquirySent(eventLocation());
        // A later inquiry in this tab counts as direct unless a call to action is clicked again (AC-2).
        forgetContactLocation();
        source.current = null;
      }
      let result: { fieldErrors?: Record<string, string> } = {};
      try {
        result = await response.json();
      } catch {}
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
      trackInquiryFailed(eventLocation(), "network");
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
      <p className="rounded-xl border border-border p-6">
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
            ? "mb-6 rounded-lg border border-border p-4 focus:outline-none focus:ring-2 focus:ring-ring"
            : ""
        }
      >
        {message}
        {success && (
          <div className="mt-4">
            <h2 className="font-semibold">{contactData.nextSteps.title}</h2>
            <ol className="mt-2 list-decimal space-y-1 break-words pl-5 text-muted-foreground">
              {contactData.nextSteps.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
      {success ? (
        <button
          type="button"
          className={fieldClass}
          onClick={() => newDraft({ restart: true })}
        >
          Start another inquiry
        </button>
      ) : (
        <form
          ref={form}
          onSubmit={submit}
          onInput={startDraft}
          className="space-y-6"
        >
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
              <label htmlFor={field.name} className="brand-label">
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
          <p className="text-sm text-muted-foreground">
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
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {pending
              ? "Sending…"
              : frozen
                ? "Retry this draft"
                : "Send inquiry"}
          </button>
          {frozen && !pending && (
            <button
              type="button"
              onClick={() => newDraft()}
              className="ml-4 underline"
            >
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
