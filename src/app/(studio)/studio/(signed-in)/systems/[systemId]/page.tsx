import type { Metadata } from "next";
import Link from "next/link";
import { notFoundOr } from "@/studio/clients/page-errors";
import { SYSTEM_LAYER_LABELS } from "@/studio/db/constants";
import { SYSTEM_NOTE_PAGE_SIZE, getSystemDetail, type SystemDetail } from "@/studio/data/systems";
import { formatDate, formatDateTime } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import {
  archiveSystemAction,
  deleteSystemLinkAction,
  deleteSystemNoteAction,
  deleteSystemResourceAction,
  restoreSystemAction,
} from "@/studio/systems/actions";
import ConfirmSubmit from "../../../_components/ConfirmSubmit";
import Paging from "../../../_components/Paging";
import { LINK_STATE_LABELS, RESOURCE_KIND_LABELS, SYSTEM_STATUS_LABELS } from "../../../_components/system-labels";
import { card, pageEyebrow, primaryButton, secondaryButton, textLink } from "../../../_components/ui";

export const metadata: Metadata = {
  title: "System · Studio",
  robots: { index: false, follow: false },
};

const sectionTitle = "text-2xl font-semibold";
const empty = `${card} p-5 text-sm text-stone-600 dark:text-stone-300`;
const muted = "text-stone-500 dark:text-stone-400";
const tag = "rounded-full px-2 py-0.5 text-xs font-semibold";

function Section({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
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

function Text({ value }: { value: string | null }) {
  return value ? <span className="whitespace-pre-wrap break-words">{value}</span> : <span className={muted}>None</span>;
}

type Connection = SystemDetail["sendsTo"][number];

function ConnectionList({
  title,
  rows,
  detail,
  outgoing,
}: {
  title: string;
  rows: Connection[];
  detail: SystemDetail;
  outgoing: boolean;
}) {
  const live = !detail.system.archivedAt;
  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className={empty}>None.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((link) => {
            const editable = live && !link.otherArchivedAt;
            // A link belongs to its from system's page.
            const owner = outgoing ? detail.system.id : link.otherId;
            return (
              <li key={link.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={`/studio/systems/${link.otherId}`} className={`${textLink} break-words`}>
                      {link.otherName}
                    </Link>
                    <span className={`${tag} bg-stone-300 text-stone-800 dark:bg-stone-700 dark:text-stone-200`}>
                      {LINK_STATE_LABELS[link.state]}
                    </span>
                    {link.otherArchivedAt && (
                      <span className={`${tag} bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200`}>
                        Archived
                      </span>
                    )}
                  </p>
                  {editable && (
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/studio/systems/${owner}/links/${link.id}/edit`}
                        className={`${textLink} text-sm`}
                        aria-label={`Edit link with ${link.otherName}`}
                      >
                        Edit
                      </Link>
                      {outgoing && (
                        <ConfirmSubmit
                          action={deleteSystemLinkAction}
                          fields={{ systemId: detail.system.id, linkId: link.id }}
                          triggerLabel="Delete"
                          triggerAriaLabel={`Delete link to ${link.otherName}`}
                          title="Delete this link?"
                          description="The link is removed for good. This cannot be undone."
                          confirmLabel="Delete link"
                        />
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-2 break-words text-sm">{link.label}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default async function SystemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ systemId: string }>;
  searchParams: Promise<{ notesPage?: string | string[] }>;
}) {
  await requireStudioAccess();
  const { systemId } = await params;
  const rawPage = (await searchParams).notesPage;
  const notesPage = typeof rawPage === "string" && /^\d{1,4}$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;

  let detail: SystemDetail;
  try {
    detail = await getSystemDetail(systemId, notesPage);
  } catch (err) {
    notFoundOr(err);
  }

  const { system } = detail;
  const live = !system.archivedAt;
  const base = `/studio/systems/${system.id}`;

  return (
    <main className="container py-12 md:py-16">
      <Link href={live ? "/studio/systems" : "/studio/systems?archived=1"} className={`${textLink} text-sm`}>
        ← {live ? "All systems" : "Archived systems"}
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={pageEyebrow}>System · {system.id}</p>
          <h1 className="mt-2 break-words text-4xl md:text-5xl">{system.name}</h1>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {live ? (
            <>
              <Link href={`${base}/edit`} className={primaryButton}>
                Edit system
              </Link>
              <ConfirmSubmit
                action={archiveSystemAction}
                fields={{ systemId: system.id }}
                triggerLabel="Archive system"
                title={`Archive ${system.name}?`}
                description="It leaves the board, becomes read only, and drops out of the export with its links. You can restore it later."
                confirmLabel="Archive system"
              />
            </>
          ) : (
            <ConfirmSubmit
              action={restoreSystemAction}
              fields={{ systemId: system.id }}
              triggerLabel="Restore system"
              title={`Restore ${system.name}?`}
              description="It comes back to the board with its links, and the export includes it again if it is published."
              confirmLabel="Restore system"
            />
          )}
        </div>
      </div>

      {system.archivedAt && (
        <p className="mt-6 rounded-lg border border-stone-400 bg-stone-300 px-4 py-3 text-sm font-semibold dark:border-stone-600 dark:bg-stone-800">
          Archived on {formatDate(system.archivedAt)}. It is read only until you restore it.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="public-title" className={`${card} p-5`}>
          <h2 id="public-title" className="text-lg font-semibold">
            Public <span className={`text-sm font-normal ${muted}`}>(what the export may publish)</span>
          </h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="font-semibold">Published</dt>
            <dd>{system.published ? "On" : "Off"}</dd>
            <dt className="font-semibold">Name</dt>
            <dd className="break-words">{system.name}</dd>
            <dt className="font-semibold">Status</dt>
            <dd>{SYSTEM_STATUS_LABELS[system.status]}</dd>
            <dt className="font-semibold">Layer</dt>
            <dd>{SYSTEM_LAYER_LABELS[system.layer]}</dd>
            <dt className="font-semibold">Public summary</dt>
            <dd>
              <Text value={system.publicSummary} />
            </dd>
            <dt className="font-semibold">Standalone</dt>
            <dd>{system.standalone ? "Yes" : "No"}</dd>
            <dt className="font-semibold">Sort order</dt>
            <dd className="tabular-nums">{system.sortOrder}</dd>
          </dl>
        </section>

        <section aria-labelledby="private-title" className={`${card} p-5`}>
          <h2 id="private-title" className="text-lg font-semibold">
            Private, studio only
          </h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="font-semibold">Summary</dt>
            <dd>
              <Text value={system.summary} />
            </dd>
            <dt className="font-semibold">Lessons</dt>
            <dd>
              <Text value={system.lessons} />
            </dd>
            <dt className="font-semibold">Stack</dt>
            <dd>
              {system.stack.length === 0 ? (
                <span className={muted}>None</span>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {system.stack.map((item, index) => (
                    <li key={`${index}-${item}`} className={`${tag} bg-stone-300 text-stone-800 dark:bg-stone-700 dark:text-stone-200`}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </dl>
        </section>
      </div>

      <Section
        id="connections-title"
        title="Connections"
        action={
          live && (
            <Link href={`${base}/links/new`} className={secondaryButton}>
              Add link
            </Link>
          )
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ConnectionList title="Sends to" rows={detail.sendsTo} detail={detail} outgoing />
          <ConnectionList title="Receives from" rows={detail.receivesFrom} detail={detail} outgoing={false} />
        </div>
      </Section>

      <Section
        id="resources-title"
        title="Resources"
        action={
          live && (
            <Link href={`${base}/resources/new`} className={secondaryButton}>
              Add resource
            </Link>
          )
        }
      >
        {detail.resources.length === 0 ? (
          <p className={empty}>No resources yet.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {detail.resources.map((resource) => (
              <li key={resource.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0">
                    <span className={`block text-xs ${muted}`}>{RESOURCE_KIND_LABELS[resource.kind]}</span>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className={`${textLink} break-all`}>
                      {resource.label}
                    </a>
                  </p>
                  {live && (
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`${base}/resources/${resource.id}/edit`}
                        className={`${textLink} text-sm`}
                        aria-label={`Edit ${resource.label}`}
                      >
                        Edit
                      </Link>
                      <ConfirmSubmit
                        action={deleteSystemResourceAction}
                        fields={{ systemId: system.id, resourceId: resource.id }}
                        triggerLabel="Delete"
                        triggerAriaLabel={`Delete ${resource.label}`}
                        title="Delete this resource?"
                        description="The resource is removed for good. This cannot be undone."
                        confirmLabel="Delete resource"
                      />
                    </div>
                  )}
                </div>
                <p className={`mt-1 break-all text-xs ${muted}`}>{resource.url}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        id="notes-title"
        title="Notes"
        action={
          live && (
            <Link href={`${base}/notes/new`} className={secondaryButton}>
              Add note
            </Link>
          )
        }
      >
        {detail.notes.length === 0 ? (
          <p className={empty}>{detail.noteTotal === 0 ? "No notes yet." : "No notes on this page."}</p>
        ) : (
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
                          href={`${base}/notes/${note.id}/edit`}
                          className={`${textLink} text-sm`}
                          aria-label={`Edit note from ${time}`}
                        >
                          Edit
                        </Link>
                        <ConfirmSubmit
                          action={deleteSystemNoteAction}
                          fields={{ systemId: system.id, noteId: note.id }}
                          triggerLabel="Delete"
                          triggerAriaLabel={`Delete note from ${time}`}
                          title="Delete this note?"
                          description="The note is removed for good. This cannot be undone."
                          confirmLabel="Delete note"
                        />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">{note.body}</p>
                </li>
              );
            })}
          </ul>
        )}
        <Paging
          page={detail.notesPage}
          pageSize={SYSTEM_NOTE_PAGE_SIZE}
          total={detail.noteTotal}
          hrefFor={(page) => `${base}?notesPage=${page}#notes-title`}
        />
      </Section>
    </main>
  );
}
