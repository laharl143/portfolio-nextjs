import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { updateClientAction } from "@/studio/clients/actions";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getClientForEdit, type ClientForEdit } from "@/studio/data/clients";
import { requireStudioAccess } from "@/studio/guard";
import ClientForm from "../../../../_components/ClientForm";
import FormPage from "../../../../_components/FormPage";

export const metadata: Metadata = {
  title: "Edit client · Studio",
  robots: { index: false, follow: false },
};

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
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
    <FormPage backHref={detailHref} backLabel={client.name} eyebrow="Edit client" title={client.name}>
      <ClientForm
        action={updateClientAction}
        initial={{
          name: client.name,
          status: client.status,
          website: client.website ?? "",
          industry: client.industry ?? "",
        }}
        hidden={{ clientId: client.id, version: client.version }}
        submitLabel="Save client"
        cancelHref={detailHref}
        reloadHref={`${detailHref}/edit`}
      />
    </FormPage>
  );
}
