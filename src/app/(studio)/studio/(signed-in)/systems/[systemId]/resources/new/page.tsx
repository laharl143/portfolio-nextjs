import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getSystemForEdit, type SystemForEdit } from "@/studio/data/systems";
import { requireStudioAccess } from "@/studio/guard";
import { createSystemResourceAction } from "@/studio/systems/actions";
import FormPage from "../../../../../_components/FormPage";
import SystemResourceForm from "../../../../../_components/SystemResourceForm";

export const metadata: Metadata = {
  title: "Add resource · Studio",
  robots: { index: false, follow: false },
};

// Add a private resource link (spec 0008, AC-6).
export default async function NewSystemResourcePage({ params }: { params: Promise<{ systemId: string }> }) {
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
    <FormPage backHref={detailHref} backLabel={system.name} eyebrow={system.name} title="Add resource">
      <SystemResourceForm
        action={createSystemResourceAction}
        initial={{ kind: "repo" }}
        hidden={{ systemId: system.id }}
        submitLabel="Add resource"
        cancelHref={detailHref}
      />
    </FormPage>
  );
}
