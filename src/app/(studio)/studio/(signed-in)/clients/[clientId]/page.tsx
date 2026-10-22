import type { Metadata } from "next";
import Link from "next/link";
import { archiveClientAction, createNoteAction, deleteNoteAction } from "@/studio/clients/actions";
import { notFoundOr } from "@/studio/clients/page-errors";
import { NOTE_LIMIT, getClientDetail, type ClientDetail } from "@/studio/data/clients";
import { listClientContracts, type ContractRow } from "@/studio/data/contracts";
import { formatAmount, formatDate, formatDateTime, formatPlainDate, statusLabel } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import ConfirmSubmit from "../../../_components/ConfirmSubmit";
import NoteForm from "../../../_components/NoteForm";
import StatusBadge from "../../../_components/StatusBadge";
import { card, pageEyebrow, primaryButton, secondaryButton, textLink } from "../../../_components/ui";

export const metadata: Metadata = {
  title: "Client · Studio",
  robots: { index: false, follow: false },
};

const sectionTitle = "text-2xl font-semibold";
const empty = `${card} p-5 text-sm text-stone-600 dark:text-stone-300`;
const muted = "text-stone-500 dark:text-stone-400";

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = `${title.toLowerCase()}-title`;
  return (
    <section aria-labelledby={id} className="mt-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className={sectionTitle}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Contacts({ detail, live }: { detail: ClientDetail; live: boolean }) {
  const base = `/studio/clients/${detail.client.id}`;
  return (
    <Section
      title="Contacts"
      action={
        live && (
          <Link href={`${base}/contacts/new`} className={secondaryButton}>
            Add contact
          </Link>
        )
      }
    >
      {detail.contacts.length === 0 ? (
        <p className={empty}>No contacts yet.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {detail.contacts.map((contact) => (
            <li key={contact.id} className={`${card} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="break-words font-semibold">
                  {contact.fullName}
                  {contact.isPrimary && (
                    <span className="ml-2 rounded-full bg-red-orange-500 px-2 py-0.5 text-xs font-bold text-stone-950">
                      Primary
                    </span>
                  )}
                </p>
                {live && (
                  <Link
                    href={`${base}/contacts/${contact.id}/edit`}
                    className={`${textLink} text-sm`}
                    aria-label={`Edit ${contact.fullName}`}
                  >
                    Edit
                  </Link>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {contact.email && (
                  <>
                    <dt className={muted}>Email</dt>
                    <dd className="break-all">
                      <a href={`mailto:${contact.email}`} className={textLink}>
                        {contact.email}
                      </a>
                    </dd>
                  </>
                )}
                {contact.phone && (
                  <>
                    <dt className={muted}>Phone</dt>
                    <dd className="break-words">{contact.phone}</dd>
                  </>
                )}
                {contact.preferredChannel && (
                  <>
                    <dt className={muted}>Prefers</dt>
                    <dd>{statusLabel(contact.preferredChannel)}</dd>
                  </>
                )}
              </dl>
              <Link className={`${textLink} mt-3 inline-block text-sm`} href={`/studio/retention/contact/${contact.id}`}>
                Retention hold and policy
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function projectDates(project: ClientDetail["projects"][number]): string {
  const parts = [
    project.startDate ? `Starts ${formatPlainDate(project.startDate)}` : "",
    project.targetEndDate ? `Target ${formatPlainDate(project.targetEndDate)}` : "",
    project.actualEndDate ? `Ended ${formatPlainDate(project.actualEndDate)}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function Projects({ detail, live }: { detail: ClientDetail; live: boolean }) {
  const base = `/studio/clients/${detail.client.id}`;
  return (
    <Section
      title="Projects"
      action={
        live && (
          <Link href={`${base}/projects/new`} className={secondaryButton}>
            Add project
          </Link>
        )
      }
    >
      {detail.projects.length === 0 ? (
        <p className={empty}>No projects yet.</p>
      ) : (
        <ul className="grid gap-3">
          {detail.projects.map((project) => (
            <li key={project.id} className={`${card} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 break-words font-semibold">
                  {project.name}
                  <StatusBadge status={project.status} />
                </p>
                {live && (
                  <Link
                    href={`${base}/projects/${project.id}/edit`}
                    className={`${textLink} text-sm`}
                    aria-label={`Edit ${project.name}`}
                  >
                    Edit
                  </Link>
                )}
              </div>
              {projectDates(project) && <p className={`mt-1 text-sm ${muted}`}>{projectDates(project)}</p>}
              {project.description && (
                <p className="mt-2 whitespace-pre-line break-words text-sm">{project.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// Live contracts of this client, newest status change first (spec 0007, AC-9).
function Contracts({ detail, contracts, live }: { detail: ClientDetail; contracts: ContractRow[]; live: boolean }) {
  return (
    <Section
      title="Contracts"
      action={
        live && (
          <Link href={`/studio/clients/${detail.client.id}/contracts/new`} className={secondaryButton}>
            New contract
          </Link>
        )
      }
    >
      {contracts.length === 0 ? (
        <p className={empty}>No contracts yet.</p>
      ) : (
        <ul className="grid gap-3">
          {contracts.map((contract) => (
            <li key={contract.id} className={`${card} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/studio/contracts/${contract.id}`} className={`${textLink} break-words`}>
                  {contract.title}
                </Link>
                <StatusBadge status={contract.status} />
              </div>
              <p className={`mt-1 flex flex-wrap gap-x-4 text-sm ${muted}`}>
                <span className="tabular-nums">
                  {contract.amountMinor === null ? "No amount" : formatAmount(contract.amountMinor, contract.currency)}
                </span>
                <span>Last change {formatDate(contract.lastChangeAt)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Notes({ detail, live }: { detail: ClientDetail; live: boolean }) {
  const clientId = detail.client.id;
  return (
    <Section title="Notes">
      {live && (
        <div className={`${card} mb-4 p-4`}>
          <NoteForm action={createNoteAction} hidden={{ clientId }} submitLabel="Add note" label="New note" />
        </div>
      )}
      {detail.notes.length === 0 ? (
        <p className={empty}>No notes yet.</p>
      ) : (
        <>
          {detail.noteTotal > NOTE_LIMIT && (
            <p className={`mb-3 text-sm ${muted}`}>Showing the latest {NOTE_LIMIT} notes</p>
          )}
          <ul className="grid gap-3">
            {detail.notes.map((note) => {
              const time = formatDateTime(note.createdAt);
              return (
                <li key={note.id} className={`${card} p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={`text-xs ${muted}`}>
                      <time dateTime={note.createdAt.toISOString()}>{time}</time>
                      {note.updatedAt > note.createdAt && <span> · edited</span>}
                    </p>
                    {live && (
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/studio/clients/${clientId}/notes/${note.id}/edit`}
                          className={`${textLink} text-sm`}
                          aria-label={`Edit note from ${time}`}
                        >
                          Edit
                        </Link>
                        <ConfirmSubmit
                          action={deleteNoteAction}
                          fields={{ clientId, noteId: note.id }}
                          triggerLabel="Delete"
                          triggerAriaLabel={`Delete note from ${time}`}
                          title="Delete this note?"
                          description="The note is removed for good. This cannot be undone."
                          confirmLabel="Delete note"
                        />
                      </div>
                    )}
                  </div>
                  {/* Plain text with its line breaks kept; React escapes it (spec 0006, AC-9). */}
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">{note.body}</p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Section>
  );
}

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  await requireStudioAccess();
  const { clientId } = await params;

  let detail: ClientDetail;
  let contracts: ContractRow[];
  try {
    [detail, contracts] = await Promise.all([getClientDetail(clientId), listClientContracts(clientId)]);
  } catch (err) {
    notFoundOr(err);
  }

  const { client } = detail;
  const live = !client.archivedAt;

  return (
    <main className="container py-12 md:py-16">
      <Link href={live ? "/studio/clients" : "/studio/clients?archived=1"} className={`${textLink} text-sm`}>
        ← {live ? "All clients" : "Archived clients"}
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={pageEyebrow}>Client</p>
          <h1 className="mt-2 break-words text-4xl md:text-5xl">{client.name}</h1>
          <Link href={`/studio/retention/client/${client.id}`} className={`${textLink} mt-3 inline-block text-sm`}>
            Retention hold and policy
          </Link>
        </div>
        {live && (
          <div className="flex flex-wrap items-start gap-3">
            <Link href={`/studio/clients/${client.id}/edit`} className={primaryButton}>
              Edit client
            </Link>
            <ConfirmSubmit
              action={archiveClientAction}
              fields={{ clientId: client.id }}
              triggerLabel="Archive client"
              title={`Archive ${client.name}?`}
              description="It leaves your client list and becomes read only. You can still find it under archived clients. There is no unarchive."
              confirmLabel="Archive client"
            />
          </div>
        )}
      </div>

      {client.archivedAt && (
        <p className="mt-6 rounded-lg border border-stone-400 bg-stone-300 px-4 py-3 text-sm font-semibold dark:border-stone-600 dark:bg-stone-800">
          Archived on {formatDate(client.archivedAt)}
        </p>
      )}

      <dl className={`${card} mt-8 grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-3 p-5 text-sm`}>
        <dt className="font-semibold">Status</dt>
        <dd>
          <StatusBadge status={client.status} />
        </dd>
        <dt className="font-semibold">Website</dt>
        <dd className="break-all">
          {client.website && /^https?:\/\//i.test(client.website) ? (
            <a href={client.website} target="_blank" rel="noopener noreferrer" className={textLink}>
              {client.website}
            </a>
          ) : (
            (client.website ?? "—")
          )}
        </dd>
        <dt className="font-semibold">Industry</dt>
        <dd className="break-words">{client.industry ?? "—"}</dd>
      </dl>

      <Contacts detail={detail} live={live} />
      <Projects detail={detail} live={live} />
      <Contracts detail={detail} contracts={contracts} live={live} />
      <Notes detail={detail} live={live} />
    </main>
  );
}
