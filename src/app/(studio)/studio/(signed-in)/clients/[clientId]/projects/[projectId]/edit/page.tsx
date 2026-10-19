import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { archiveProjectAction, updateProjectAction } from "@/studio/clients/actions";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getProjectForEdit } from "@/studio/data/projects";
import { requireStudioAccess } from "@/studio/guard";
import ConfirmSubmit from "../../../../../../_components/ConfirmSubmit";
import FormPage from "../../../../../../_components/FormPage";
import ProjectForm from "../../../../../../_components/ProjectForm";

export const metadata: Metadata = {
  title: "Edit project · Studio",
  robots: { index: false, follow: false },
};

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ clientId: string; projectId: string }>;
}) {
  await requireStudioAccess();
  const { clientId, projectId } = await params;

  let project: Awaited<ReturnType<typeof getProjectForEdit>>;
  try {
    project = await getProjectForEdit(clientId, projectId);
  } catch (err) {
    notFoundOr(err);
  }
  const detailHref = `/studio/clients/${clientId}`;
  if (project.clientArchivedAt) {
    redirect(detailHref);
  }

  return (
    <FormPage backHref={detailHref} backLabel={project.clientName} eyebrow={project.clientName} title={project.name}>
      <ProjectForm
        action={updateProjectAction}
        initial={{
          name: project.name,
          status: project.status,
          description: project.description ?? "",
          startDate: project.startDate ?? "",
          targetEndDate: project.targetEndDate ?? "",
          actualEndDate: project.actualEndDate ?? "",
        }}
        hidden={{ clientId, projectId: project.id, version: project.version }}
        submitLabel="Save project"
        cancelHref={detailHref}
        reloadHref={`${detailHref}/projects/${project.id}/edit`}
      />
      <div className="mt-12 max-w-xl border-t border-stone-300 pt-6 dark:border-stone-700">
        <ConfirmSubmit
          action={archiveProjectAction}
          fields={{ clientId, projectId: project.id }}
          triggerLabel="Archive project"
          title={`Archive ${project.name}?`}
          description="The project no longer shows on the client page."
          confirmLabel="Archive project"
        />
      </div>
    </FormPage>
  );
}
