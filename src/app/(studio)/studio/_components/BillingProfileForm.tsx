"use client";

import Link from "next/link";
import { useActionState } from "react";
import { INITIAL_ACTION_STATE, type ActionState } from "@/studio/clients/action-state";
import { TextAreaField, TextField } from "./Field";
import FormMessage, { errorOf, stateKey, valueOf } from "./FormMessage";
import PendingButton from "./PendingButton";
import { primaryButton, textLink } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// Your billing profile (spec 0013, AC-1): the business block, payment instructions, and defaults on every invoice.
export default function BillingProfileForm({
  action,
  initial,
  version,
}: {
  action: Action;
  initial: Record<string, string>;
  // Empty until the first save.
  version: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const value = (key: string) => valueOf(state, initial, key);
  const field = (name: string) => ({ name, defaultValue: value(name), error: errorOf(state, name) });

  return (
    <form key={stateKey(state)} action={formAction} noValidate className="grid max-w-xl gap-5">
      <input type="hidden" name="version" value={version} />
      <FormMessage state={state} reloadHref="/studio/invoices/profile" />
      <TextField {...field("businessName")} label="Business name" required maxLength={200} autoComplete="organization" />
      <TextAreaField {...field("address")} label="Address" required maxLength={1000} rows={3} />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField {...field("tin")} label="TIN" maxLength={30} inputMode="numeric" hint="Digits and hyphens" />
        <TextField {...field("phone")} label="Phone" maxLength={50} type="tel" autoComplete="tel" />
      </div>
      <TextField {...field("email")} label="Email" maxLength={320} type="email" autoComplete="email" />
      <TextAreaField
        {...field("paymentInstructions")}
        label="Payment instructions"
        required
        maxLength={2000}
        hint="Printed on every invoice, like your bank or GCash details."
      />
      <TextField
        {...field("taxNote")}
        label="Tax note"
        maxLength={200}
        hint='Printed under the total, like "Non VAT registered".'
      />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField {...field("documentTitle")} label="Document title" required maxLength={60} />
        <TextField
          {...field("defaultPaymentTermsDays")}
          label="Default payment terms (days)"
          required
          maxLength={3}
          inputMode="numeric"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <PendingButton className={primaryButton}>Save profile</PendingButton>
        <Link href="/studio/invoices" className={textLink}>
          Back to invoices
        </Link>
      </div>
    </form>
  );
}
