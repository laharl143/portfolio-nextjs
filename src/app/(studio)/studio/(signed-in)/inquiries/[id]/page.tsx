import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudioAccess } from "@/studio/guard";
import { getInquiry } from "@/studio/data/inquiries";
import {
  changeInquiryStatusAction,
  retryInquiryAlertAction,
} from "@/studio/inquiries/actions";
import { IntakeError } from "@/inquiries/rules";
import { formatDateTime } from "@/studio/format";
import MutationForm from "../_components/MutationForm";
import { card, textLink } from "../../../_components/ui";
export default async function InquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStudioAccess();
  const { id } = await params;
  const result = await getInquiry(id).catch((error) => {
    if (error instanceof IntakeError && error.status === 404) notFound();
    throw error;
  });
  const { inquiry: i, alert: a, events } = result;
  return (
    <main className="container max-w-4xl space-y-6 py-10">
      <Link href="/studio/inquiries" className={textLink}>
        Inquiries
      </Link>
      <h1 className="break-words text-3xl font-semibold">{i.name}</h1>
      <p>
        {i.status} · Received {formatDateTime(new Date(i.created_at))}
      </p>
      <dl className={`${card} space-y-4 break-words p-6`}>
        {[
          ["Email", i.email],
          ["Company", i.company ?? "Not provided"],
          ["Budget", i.budget ?? "Not provided"],
          ["Project description", i.description],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="font-semibold">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>
      {i.status === "converted" ? (
        <Link
          href={`/studio/clients/${i.converted_client_id}`}
          className={textLink}
        >
          View converted client
        </Link>
      ) : (
        <div className="flex flex-wrap gap-6">
          {["new", "reviewing"].includes(i.status) && (
            <Link className={textLink} href={`/studio/inquiries/${id}/convert`}>
              Review conversion
            </Link>
          )}
          {(i.status === "new"
            ? ["reviewing", "closed"]
            : i.status === "reviewing"
              ? ["closed"]
              : ["reviewing"]
          ).map((target) => (
            <MutationForm
              key={target}
              action={changeInquiryStatusAction}
              label={
                i.status === "closed" ? "Reopen as Reviewing" : `Mark ${target}`
              }
            >
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={i.updated_at} />
              <input type="hidden" name="target" value={target} />
            </MutationForm>
          ))}
        </div>
      )}
      <section className={`${card} space-y-4 p-6`}>
        <h2 className="text-xl font-semibold">Owner alert</h2>
        <p>
          State: {a.expired ? "unknown (expired sending lease)" : a.state}.
          Attempts: {a.attempt_count}. Provider acceptance does not prove
          delivery.
        </p>
        {a.error_code && <p>{a.error_code}</p>}
        {a.state !== "accepted" && (
          <MutationForm
            action={retryInquiryAlertAction}
            label="Try owner alert"
          >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="alertVersion" value={a.updated_at} />
            <input type="hidden" name="generation" value={a.generation} />
            {a.outside_window && ["unknown", "sending"].includes(a.state) && (
              <label className="block">
                <input type="checkbox" name="confirmDuplicate" required /> I
                understand another alert may arrive after the provider
                deduplication window.
              </label>
            )}
            <p className="text-sm">
              Retries wait at least one minute. A sending attempt holds a 30
              second lease.
            </p>
          </MutationForm>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold">History</h2>
        <ul className="mt-3 space-y-2">
          {events.map((event, index) => (
            <li key={index}>
              {event.kind} · {formatDateTime(new Date(event.created_at))}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
