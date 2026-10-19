import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createProjectAction } from "@/studio/clients/actions";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getClientForEdit, type ClientForEdit } from "@/studio/data/clients";
import { requireStudioAccess } from "@/studio/guard";
import FormPage from "../../../../../_components/FormPage";
import ProjectForm from "../../../../../_components/ProjectForm";

export const metadata: Metadata = {
  title: "New project · Studio",
  robots: { index: false, follow: false },
};

export default async function NewProjectPage({ params }: { params: Promise<{ clientId: string }> }) {
  await requireStudioAccess();
  const { clientId } = await params;

  let client: ClientForEdit;
  try {
    client = await getClientForEdit(clientId);
  } catch (err) {
    notFoundOr(err);
  }
  const detailHref = `/studio/clients/${client.id}`;
  if (client.archivedAt) {
    redirect(detailHref);
  }

  return (
    <FormPage backHref={detailHref} backLabel={client.name} eyebrow={client.name} title="New project">
      <ProjectForm
        action={createProjectAction}
        initial={{ status: "planned" }}
        hidden={{ clientId: client.id }}
        submitLabel="Add project"
        cancelHref={detailHref}
      />
    </FormPage>
  );
}
