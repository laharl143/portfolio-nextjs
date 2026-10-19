import type { Metadata } from "next";
import { createClientAction } from "@/studio/clients/actions";
import { requireStudioAccess } from "@/studio/guard";
import ClientForm from "../../../_components/ClientForm";
import FormPage from "../../../_components/FormPage";

export const metadata: Metadata = {
  title: "New client · Studio",
  robots: { index: false, follow: false },
};

export default async function NewClientPage() {
  await requireStudioAccess();
  return (
    <FormPage backHref="/studio/clients" backLabel="All clients" eyebrow="Clients" title="New client">
      <ClientForm
        action={createClientAction}
        initial={{ status: "lead" }}
        submitLabel="Create client"
        cancelHref="/studio/clients"
      />
    </FormPage>
  );
}
