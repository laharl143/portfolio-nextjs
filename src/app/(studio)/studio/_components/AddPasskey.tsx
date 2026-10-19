"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { finishAddPasskey, startAddPasskey } from "@/studio/auth/actions";
import { PASSKEY_ADDED, UNSUPPORTED, WAITING, browserErrorMessage, failedMessage, messageFor } from "./messages";
import { usePasskeySupport } from "./usePasskeySupport";

function countLine(count: number): string {
  return count === 1 ? "You have 1 passkey" : `You have ${count} passkeys`;
}

// Security page: the passkey count and "Add another passkey" (spec 0005, AC-9).
export default function AddPasskey({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const supported = usePasskeySupport();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    setMessage("");
    startTransition(async () => {
      let response;
      try {
        const optionsJSON = await startAddPasskey();
        response = await startRegistration({ optionsJSON });
      } catch (error) {
        setMessage(browserErrorMessage(error, "security"));
        return;
      }
      try {
        const result = await finishAddPasskey(response);
        if (result.ok) {
          setCount(result.count);
          setMessage(PASSKEY_ADDED);
        } else {
          setMessage(messageFor(result.code, "security"));
        }
      } catch {
        setMessage(failedMessage("security"));
      }
    });
  }

  return (
    <div className="rounded-xl border border-stone-300 bg-stone-100 p-6 dark:border-stone-700 dark:bg-stone-800">
      <h2 className="text-lg font-semibold">Passkeys</h2>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{countLine(count)}</p>
      <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">
        Add a passkey on your other devices (a phone and a laptop) so losing one never locks you out.
      </p>
      <button
        type="button"
        onClick={add}
        disabled={!supported || pending}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-stone-900 px-5 text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 dark:focus-visible:ring-offset-stone-800"
      >
        <Plus aria-hidden="true" className="size-4" />
        {pending ? WAITING : "Add another passkey"}
      </button>
      <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm">
        {supported ? message : UNSUPPORTED}
      </p>
    </div>
  );
}
