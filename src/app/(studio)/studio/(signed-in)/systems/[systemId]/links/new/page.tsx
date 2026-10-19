import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getSystemForEdit, listLinkTargets, type SystemForEdit } from "@/studio/data/systems";
import { requireStudioAccess } from "@/studio/guard";
import { createSystemLinkAction } from "@/studio/systems/actions";
import FormPage from "../../../../../_components/FormPage";
import SystemLinkForm from "../../../../../_components/SystemLinkForm";

export const metadata: Metadata = {
  title: "Add link · Studio",
  robots: { index: false, follow: false },
};

// Add a link this system sends to another live system (spec 0008, AC-5).
export default async function NewSystemLinkPage({ params }: { params: Promise<{ systemId: string }> }) {
  await requireStudioAccess();
  const { systemId } = await params;

  let system: SystemForEdit;
  let targets: Awaited<ReturnType<typeof listLinkTargets>>;
  try {
    [system, targets] = await Promise.all([getSystemForEdit(systemId), listLinkTargets(systemId)]);
  } catch (err) {
    notFoundOr(err);
  }
  const detailHref = `/studio/systems/${system.id}`;
  if (system.archivedAt) {
    redirect(detailHref);
  }

  return (
    <FormPage backHref={detailHref} backLabel={system.name} eyebrow={system.name} title="Add link">
      <SystemLinkForm
        action={createSystemLinkAction}
        initial={{ state: "planned" }}
        hidden={{ systemId: system.id }}
        targets={targets}
        submitLabel="Add link"
        cancelHref={detailHref}
      />
    </FormPage>
  );
}
