import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getSystemNoteForEdit } from "@/studio/data/notes";
import { requireStudioAccess } from "@/studio/guard";
import { updateSystemNoteAction } from "@/studio/systems/actions";
import FormPage from "../../../../../../_components/FormPage";
import NoteForm from "../../../../../../_components/NoteForm";

export const metadata: Metadata = {
  title: "Edit note · Studio",
  robots: { index: false, follow: false },
};

export default async function EditSystemNotePage({ params }: { params: Promise<{ systemId: string; noteId: string }> }) {
  await requireStudioAccess();
  const { systemId, noteId } = await params;

  let note: Awaited<ReturnType<typeof getSystemNoteForEdit>>;
  try {
    note = await getSystemNoteForEdit(systemId, noteId);
  } catch (err) {
    notFoundOr(err);
  }
  const detailHref = `/studio/systems/${systemId}`;
  if (note.systemArchivedAt) {
    redirect(detailHref);
  }

  return (
    <FormPage backHref={detailHref} backLabel={note.systemName} eyebrow={note.systemName} title="Edit note">
      <div className="max-w-2xl">
        <NoteForm
          action={updateSystemNoteAction}
          initial={{ body: note.body }}
          hidden={{ systemId, noteId: note.id, version: note.version }}
          submitLabel="Save note"
          cancelHref={detailHref}
          reloadHref={`${detailHref}/notes/${note.id}/edit`}
          maxLength={5000}
        />
      </div>
    </FormPage>
  );
}
