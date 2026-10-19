import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { updateNoteAction } from "@/studio/clients/actions";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getNoteForEdit } from "@/studio/data/notes";
import { requireStudioAccess } from "@/studio/guard";
import FormPage from "../../../../../../_components/FormPage";
import NoteForm from "../../../../../../_components/NoteForm";

export const metadata: Metadata = {
  title: "Edit note · Studio",
  robots: { index: false, follow: false },
};

export default async function EditNotePage({ params }: { params: Promise<{ clientId: string; noteId: string }> }) {
  await requireStudioAccess();
  const { clientId, noteId } = await params;

  let note: Awaited<ReturnType<typeof getNoteForEdit>>;
  try {
    note = await getNoteForEdit(clientId, noteId);
  } catch (err) {
    notFoundOr(err);
  }
  const detailHref = `/studio/clients/${clientId}`;
  if (note.clientArchivedAt) {
    redirect(detailHref);
  }

  return (
    <FormPage backHref={detailHref} backLabel={note.clientName} eyebrow={note.clientName} title="Edit note">
      <div className="max-w-2xl">
        <NoteForm
          action={updateNoteAction}
          initial={{ body: note.body }}
          hidden={{ clientId, noteId: note.id, version: note.version }}
          submitLabel="Save note"
          cancelHref={detailHref}
          reloadHref={`${detailHref}/notes/${note.id}/edit`}
        />
      </div>
    </FormPage>
  );
}
