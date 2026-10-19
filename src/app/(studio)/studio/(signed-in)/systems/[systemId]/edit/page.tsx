import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getSystemForEdit, type SystemForEdit } from "@/studio/data/systems";
import { requireStudioAccess } from "@/studio/guard";
import { updateSystemAction } from "@/studio/systems/actions";
import FormPage from "../../../../_components/FormPage";
import SystemForm from "../../../../_components/SystemForm";

export const metadata: Metadata = {
  title: "Edit system · Studio",
  robots: { index: false, follow: false },
};

// Edit every field but the slug (spec 0008, AC-3). An archived system is read only (AC-4).
export default async function EditSystemPage({ params }: { params: Promise<{ systemId: string }> }) {
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
    <FormPage backHref={detailHref} backLabel={system.name} eyebrow={`System · ${system.id}`} title="Edit system">
      <SystemForm
        action={updateSystemAction}
        initial={{
          name: system.name,
          status: system.status,
          layer: system.layer,
          published: system.published ? "on" : "",
          publicSummary: system.publicSummary,
          summary: system.summary ?? "",
          lessons: system.lessons ?? "",
          stack: system.stack.join("\n"),
          sortOrder: String(system.sortOrder),
        }}
        hidden={{ systemId: system.id, version: system.version }}
        withSlug={false}
        submitLabel="Save system"
        cancelHref={detailHref}
        reloadHref={`${detailHref}/edit`}
      />
    </FormPage>
  );
}
