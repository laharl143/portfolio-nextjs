"use client";
import { useActionState, useState } from "react";
import { convertInquiryAction } from "@/studio/inquiries/actions";
import type { ActionState } from "@/studio/clients/action-state";
import { alertBox, input, primaryButton, card } from "../../../_components/ui";
export default function ConversionForm({
  id,
  version,
  conversionKey,
  defaultName,
  defaultEmail,
  defaultClientName,
  note,
  clients,
  contacts,
}: {
  id: string;
  version: string;
  conversionKey: string;
  defaultName: string;
  defaultEmail: string;
  defaultClientName: string;
  note: string;
  clients: { id: string; name: string }[];
  contacts: {
    id: string;
    client_id: string;
    full_name: string;
    email: string;
  }[];
}) {
  const [state, action, pending] = useActionState(convertInquiryAction, {
    ok: true,
  } as ActionState);
  const [mode, setMode] = useState("new"),
    [clientId, setClientId] = useState(""),
    [clientName, setClientName] = useState(defaultClientName),
    [contactName, setContactName] = useState(defaultName),
    [contactEmail, setContactEmail] = useState(defaultEmail);
  const [stableKey] = useState(conversionKey);
  const existing =
    mode === "existing"
      ? contacts.find(
          (c) =>
            c.client_id === clientId &&
            c.email.toLowerCase() === contactEmail.trim().toLowerCase(),
        )
      : undefined;
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="conversionKey" value={stableKey} />
      <label className="block">
        Client mode
        <select
          name="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className={input}
        >
          <option value="new">Create a new Lead</option>
          <option value="existing">Link an existing client</option>
        </select>
      </label>
      {mode === "new" ? (
        <label className="block">
          New client name
          <input
            required
            name="clientName"
            maxLength={200}
            className={input}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </label>
      ) : (
        <label className="block">
          Existing live client
          <select
            required
            name="clientId"
            className={input}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Choose explicitly</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        Contact name
        <input
          required
          name="contactName"
          maxLength={200}
          className={input}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
      </label>
      <label className="block">
        Contact email
        <input
          required
          type="email"
          name="contactEmail"
          maxLength={320}
          className={input}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
      </label>
      <section className={`${card} space-y-3 p-5`}>
        <h2 className="text-xl font-semibold">Confirm conversion</h2>
        <p>
          {mode === "new"
            ? `Create Lead: ${clientName}`
            : `Link client: ${clients.find((c) => c.id === clientId)?.name ?? "Choose a client above"}`}
        </p>
        <p>
          {existing
            ? `Link existing contact ${existing.full_name} (${existing.email}), keeping its current details.`
            : `Create contact ${contactName} (${contactEmail}), preferred channel email.`}
        </p>
        <p>
          The contact becomes primary only when the client has no live primary
          contact. Existing client status stays unchanged.
        </p>
        <h3 className="font-semibold">Original project description note</h3>
        <p className="whitespace-pre-wrap break-words">{note}</p>
        <p>
          Converted contact details and this copied note become client records
          retained separately. The source inquiry is removed 12 months after
          conversion.
        </p>
      </section>
      <label className="flex gap-3">
        <input
          type="checkbox"
          name="confirmed"
          required
          className="mt-1 size-5 shrink-0"
        />
        I confirm this client, contact, and original project note.
      </label>
      {!state.ok && (
        <p role="alert" className={alertBox}>
          {state.message} ({state.code})
        </p>
      )}
      <button className={primaryButton} disabled={pending}>
        {pending ? "Converting…" : "Confirm conversion"}
      </button>
    </form>
  );
}
