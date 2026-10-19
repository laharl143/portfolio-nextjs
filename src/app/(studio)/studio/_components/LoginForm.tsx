"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import { finishSignIn, startSignIn } from "@/studio/auth/actions";
import { UNSUPPORTED, WAITING, browserErrorMessage, failedMessage, messageFor } from "./messages";
import { primaryButton, statusLine } from "./styles";
import { usePasskeySupport } from "./usePasskeySupport";

// One button: options from the server, the device prompt, then verification. Success redirects on the server.
export default function LoginForm({ next }: { next?: string }) {
  const supported = usePasskeySupport();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function signIn() {
    setMessage("");
    startTransition(async () => {
      let response;
      try {
        const optionsJSON = await startSignIn();
        response = await startAuthentication({ optionsJSON });
      } catch (error) {
        // A cancel or timeout never reaches the server, so it writes no event (spec 0005, AC-6).
        setMessage(browserErrorMessage(error, "login"));
        return;
      }
      try {
        const result = await finishSignIn(response, next);
        if (result && !result.ok) {
          setMessage(messageFor(result.code, "login"));
        }
      } catch {
        setMessage(failedMessage("login"));
      }
    });
  }

  return (
    <>
      <button type="button" className={primaryButton} onClick={signIn} disabled={!supported || pending}>
        <KeyRound aria-hidden="true" />
        {pending ? WAITING : "Sign in with passkey"}
      </button>
      <p role="status" aria-live="polite" className={statusLine}>
        {supported ? message : UNSUPPORTED}
      </p>
    </>
  );
}
