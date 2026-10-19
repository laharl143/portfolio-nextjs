import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createContactAction } from "@/studio/clients/actions";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getClientDetail, type ClientDetail } from "@/studio/data/clients";
import { requireStudioAccess } from "@/studio/guard";
import ContactForm from "../../../../../_components/ContactForm";
import FormPage from "../../../../../_components/FormPage";

export const metadata: Metadata = {
  title: "New contact · Studio",
  robots: { index: false, follow: false },
};

export default async function NewContactPage({ params }: { params: Promise<{ clientId: string }> }) {
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
  // Starts ticked when the client has no live primary contact (spec 0006, AC-7).
  const hasPrimary = detail.contacts.some((contact) => contact.isPrimary);

  return (
    <FormPage backHref={detailHref} backLabel={client.name} eyebrow={client.name} title="New contact">
      <ContactForm
        action={createContactAction}
        initial={{ isPrimary: hasPrimary ? "" : "on" }}
        hidden={{ clientId: client.id }}
        submitLabel="Add contact"
        cancelHref={detailHref}
      />
    </FormPage>
  );
}
