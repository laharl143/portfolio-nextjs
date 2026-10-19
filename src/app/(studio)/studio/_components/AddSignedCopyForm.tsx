"use client";

import { useActionState, useState } from "react";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { stateKey } from "./FormMessage";
import PendingButton from "./PendingButton";
import SignedCopyInput from "./SignedCopyInput";
import { alertBox, secondaryButton } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// "Add signed copy" on a signed, active, or ended contract (spec 0007, AC-8).
export default function AddSignedCopyForm({ action, contractId }: { action: Action; contractId: string }) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const [tooBig, setTooBig] = useState(false);
  const fileError = state.ok ? undefined : state.fieldErrors?.signedCopy;
  return (
    <form key={stateKey(state)} action={formAction} className="grid max-w-md gap-3">
      <input type="hidden" name="contractId" value={contractId} />
      {!state.ok && !fileError && (
        <p role="alert" className={alertBox}>
          {state.message}
        </p>
      )}
      <SignedCopyInput id="add-signed-copy" serverError={fileError} required onTooBig={setTooBig} />
      <div>
        {tooBig ? (
          <button type="button" disabled className={secondaryButton}>
            Add signed copy
          </button>
        ) : (
          <PendingButton className={secondaryButton}>Add signed copy</PendingButton>
        )}
      </div>
    </form>
  );
}
