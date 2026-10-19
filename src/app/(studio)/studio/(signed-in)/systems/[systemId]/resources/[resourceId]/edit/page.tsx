import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getSystemResourceForEdit } from "@/studio/data/system-resources";
import { requireStudioAccess } from "@/studio/guard";
import { updateSystemResourceAction } from "@/studio/systems/actions";
import FormPage from "../../../../../../_components/FormPage";
import SystemResourceForm from "../../../../../../_components/SystemResourceForm";

export const metadata: Metadata = {
  title: "Edit resource · Studio",
  robots: { index: false, follow: false },
};

export default async function EditSystemResourcePage({
  params,
}: {
  params: Promise<{ systemId: string; resourceId: string }>;
}) {
  await requireStudioAccess();
  const { systemId, resourceId } = await params;

  let resource: Awaited<ReturnType<typeof getSystemResourceForEdit>>;
  try {
    resource = await getSystemResourceForEdit(systemId, resourceId);
  } catch (err) {
    notFoundOr(err);
  }
  const detailHref = `/studio/systems/${systemId}`;
  if (resource.systemArchivedAt) {
    redirect(detailHref);
  }

  return (
    <FormPage backHref={detailHref} backLabel={resource.systemName} eyebrow={resource.systemName} title="Edit resource">
      <SystemResourceForm
        action={updateSystemResourceAction}
        initial={{ kind: resource.kind, label: resource.label, url: resource.url }}
        hidden={{ systemId, resourceId: resource.id, version: resource.version }}
        submitLabel="Save resource"
        cancelHref={detailHref}
        reloadHref={`${detailHref}/resources/${resource.id}/edit`}
      />
    </FormPage>
  );
}
