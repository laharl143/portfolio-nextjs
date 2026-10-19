import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { archiveContactAction, updateContactAction } from "@/studio/clients/actions";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getContactForEdit } from "@/studio/data/contacts";
import { requireStudioAccess } from "@/studio/guard";
import ConfirmSubmit from "../../../../../../_components/ConfirmSubmit";
import ContactForm from "../../../../../../_components/ContactForm";
import FormPage from "../../../../../../_components/FormPage";

export const metadata: Metadata = {
  title: "Edit contact · Studio",
  robots: { index: false, follow: false },
};

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ clientId: string; contactId: string }>;
}) {
  await requireStudioAccess();
  const { clientId, contactId } = await params;

  let contact: Awaited<ReturnType<typeof getContactForEdit>>;
  try {
    contact = await getContactForEdit(clientId, contactId);
  } catch (err) {
    notFoundOr(err);
  }
  const detailHref = `/studio/clients/${clientId}`;
  if (contact.clientArchivedAt) {
    redirect(detailHref);
  }

  return (
    <FormPage backHref={detailHref} backLabel={contact.clientName} eyebrow={contact.clientName} title={contact.fullName}>
      <ContactForm
        action={updateContactAction}
        initial={{
          fullName: contact.fullName,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          preferredChannel: contact.preferredChannel ?? "",
          isPrimary: contact.isPrimary ? "on" : "",
        }}
        hidden={{ clientId, contactId: contact.id, version: contact.version }}
        submitLabel="Save contact"
        cancelHref={detailHref}
        reloadHref={`${detailHref}/contacts/${contact.id}/edit`}
      />
      <div className="mt-12 max-w-xl border-t border-stone-300 pt-6 dark:border-stone-700">
        <ConfirmSubmit
          action={archiveContactAction}
          fields={{ clientId, contactId: contact.id }}
          triggerLabel="Archive contact"
          title={`Archive ${contact.fullName}?`}
          description={
            contact.isPrimary
              ? "The contact no longer shows on the client page, and the client will have no primary contact."
              : "The contact no longer shows on the client page."
          }
          confirmLabel="Archive contact"
        />
      </div>
    </FormPage>
  );
}
