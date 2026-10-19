"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useState, useTransition } from "react";
import { finishSetup, startSetup } from "@/studio/auth/actions";
import { UNSUPPORTED, WAITING, browserErrorMessage, failedMessage, messageFor } from "./messages";
import { primaryButton, statusLine } from "./styles";
import { usePasskeySupport } from "./usePasskeySupport";

// The typed token stays in this component's state between the two steps, never in a cookie (spec 0005).
export default function SetupForm() {
  const [token, setToken] = useState("");
  const supported = usePasskeySupport();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      let response;
      try {
        const started = await startSetup(token);
        if (!started.ok) {
          setMessage(messageFor(started.code, "setup"));
          return;
        }
        response = await startRegistration({ optionsJSON: started.options });
      } catch (error) {
        setMessage(browserErrorMessage(error, "setup"));
        return;
      }
      try {
        const result = await finishSetup(token, response);
        if (result && !result.ok) {
          setMessage(messageFor(result.code, "setup"));
        }
      } catch {
        setMessage(failedMessage("setup"));
      }
    });
  }

  return (
    <form onSubmit={submit} className="text-left">
      <label htmlFor="setup-token" className="text-sm font-semibold text-stone-200">
        Setup token
      </label>
      <input
        id="setup-token"
        name="token"
        type="password"
        autoComplete="off"
        required
        value={token}
        onChange={(event) => setToken(event.target.value)}
        aria-describedby="setup-status"
        className="mt-2 h-12 w-full rounded-lg border border-stone-600 bg-stone-800 px-4 text-stone-100 placeholder:text-stone-500 focus-visible:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500"
      />
      <button type="submit" className={`${primaryButton} mt-6`} disabled={!supported || pending || token.length === 0}>
        {pending ? WAITING : "Continue"}
      </button>
      <p id="setup-status" role="status" aria-live="polite" className={`${statusLine} text-center`}>
        {supported ? message : UNSUPPORTED}
      </p>
    </form>
  );
}
