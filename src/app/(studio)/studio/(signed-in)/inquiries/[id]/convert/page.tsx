import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudioAccess } from "@/studio/guard";
import {
  conversionClients,
  conversionContacts,
  getInquiry,
} from "@/studio/data/inquiries";
import { formatDateTime } from "@/studio/format";
import { IntakeError } from "@/inquiries/rules";
import ConversionForm from "../../_components/ConversionForm";
import { input, primaryButton, textLink } from "../../../../_components/ui";
export default async function ConvertPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireStudioAccess();
  const { id } = await params;
  const p = await searchParams;
  const { inquiry: i } = await getInquiry(id).catch((error) => {
    if (error instanceof IntakeError && error.status === 404) notFound();
    throw error;
  });
  if (i.status === "converted")
    return (
      <main className="container space-y-5 py-10">
        <h1>Already converted</h1>
        <Link
          className={textLink}
          href={`/studio/clients/${i.converted_client_id}`}
        >
          View client
        </Link>
      </main>
    );
  if (i.status === "closed")
    return (
      <main className="container space-y-5 py-10">
        <h1>Reopen this inquiry before conversion.</h1>
        <Link className={textLink} href={`/studio/inquiries/${id}`}>
          Back to inquiry
        </Link>
      </main>
    );
  const q = (p.q ?? "").slice(0, 100);
  const page = /^\d+$/.test(p.page ?? "")
    ? Math.max(1, Math.min(Number(p.page), 1000000))
    : 1;
  const all = await conversionClients(q, page);
  const clients = all.slice(0, 50);
  const contacts = await conversionContacts(clients.map((c) => c.id));
  const href = (page: number) =>
    `/studio/inquiries/${id}/convert?${new URLSearchParams({ q, page: String(page) })}`;
  const note = `Portfolio inquiry received ${formatDateTime(new Date(i.created_at))}\n\n${i.description}${i.budget ? `\n\nBudget: ${i.budget}` : ""}`;
  return (
    <main className="container max-w-3xl space-y-8 py-10">
      <Link className={textLink} href={`/studio/inquiries/${id}`}>
        Back to inquiry
      </Link>
      <h1 className="text-3xl font-semibold">Convert inquiry</h1>
      <form className="space-y-3">
        <label>
          Find an existing client
          <input name="q" maxLength={100} defaultValue={q} className={input} />
        </label>
        <button className={primaryButton}>Search clients</button>
      </form>
      <nav className="flex gap-6" aria-label="Client choice pages">
        {page > 1 && (
          <Link className={textLink} href={href(page - 1)}>
            Previous clients
          </Link>
        )}
        {all.length > 50 && (
          <Link className={textLink} href={href(page + 1)}>
            More clients
          </Link>
        )}
      </nav>
      <ConversionForm
        key={`${q}:${page}`}
        id={id}
        version={i.updated_at}
        conversionKey={randomUUID()}
        defaultName={i.name}
        defaultEmail={i.email}
        defaultClientName={i.company ?? i.name}
        note={note}
        clients={clients}
        contacts={contacts}
      />
    </main>
  );
}
