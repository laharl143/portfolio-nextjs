import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getSystemForEdit, type SystemForEdit } from "@/studio/data/systems";
import { requireStudioAccess } from "@/studio/guard";
import { createSystemNoteAction } from "@/studio/systems/actions";
import FormPage from "../../../../../_components/FormPage";
import NoteForm from "../../../../../_components/NoteForm";

export const metadata: Metadata = {
  title: "Add note · Studio",
  robots: { index: false, follow: false },
};

// Add a note to a system's log (spec 0008, AC-6).
export default async function NewSystemNotePage({ params }: { params: Promise<{ systemId: string }> }) {
  await requireStudioAccess();
  const { systemId } = await params;

  let system: SystemForEdit;
  try {
    system = await getSystemForEdit(systemId);
  } catch (err) {
    notFoundOr(err);
  }
  const detailHref = `/studio/systems/${system.id}`;
  if (system.archivedAt) {
    redirect(detailHref);
  }

  return (
    <FormPage backHref={detailHref} backLabel={system.name} eyebrow={system.name} title="Add note">
      <div className="max-w-2xl">
        <NoteForm
          action={createSystemNoteAction}
          hidden={{ systemId: system.id }}
          submitLabel="Add note"
          cancelHref={detailHref}
          maxLength={5000}
        />
      </div>
    </FormPage>
  );
}
