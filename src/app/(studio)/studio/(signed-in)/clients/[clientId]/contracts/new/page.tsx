import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { createContractAction } from "@/studio/contracts/actions";
import { getClientDetail, type ClientDetail } from "@/studio/data/clients";
import { listLiveTemplateOptions } from "@/studio/data/contract-templates";
import { requireStudioAccess } from "@/studio/guard";
import ContractForm from "../../../../../_components/ContractForm";
import FormPage from "../../../../../_components/FormPage";

export const metadata: Metadata = {
  title: "New contract · Studio",
  robots: { index: false, follow: false },
};

// New contract from a live client's page (spec 0007, AC-2). An archived client redirects to its page.
export default async function NewContractPage({ params }: { params: Promise<{ clientId: string }> }) {
  await requireStudioAccess();
  const { clientId } = await params;

  let detail: ClientDetail;
  try {
    detail = await getClientDetail(clientId);
  } catch (err) {
    notFoundOr(err);
  }
  const { client } = detail;
  const detailHref = `/studio/clients/${client.id}`;
  if (client.archivedAt) {
    redirect(detailHref);
  }
  const templates = await listLiveTemplateOptions();

  return (
    <FormPage backHref={detailHref} backLabel={client.name} eyebrow={client.name} title="New contract">
      <ContractForm
        action={createContractAction}
        initial={{}}
        hidden={{ clientId: client.id }}
        projects={detail.projects.map((project) => ({ value: project.id, label: project.name }))}
        templates={templates.map((template) => ({ value: template.id, label: template.name }))}
        submitLabel="Create contract"
        cancelHref={detailHref}
      />
    </FormPage>
  );
}
