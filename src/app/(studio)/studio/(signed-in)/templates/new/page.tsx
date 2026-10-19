import type { Metadata } from "next";
import { createTemplateAction } from "@/studio/contracts/actions";
import { requireStudioAccess } from "@/studio/guard";
import FormPage from "../../../_components/FormPage";
import TemplateForm from "../../../_components/TemplateForm";

export const metadata: Metadata = {
  title: "New template · Studio",
  robots: { index: false, follow: false },
};

export default async function NewTemplatePage() {
  await requireStudioAccess();
  return (
    <FormPage backHref="/studio/templates" backLabel="Templates" eyebrow="Templates" title="New template">
      <TemplateForm
        action={createTemplateAction}
        initial={{}}
        hidden={{}}
        submitLabel="Save template"
        cancelHref="/studio/templates"
      />
    </FormPage>
  );
}
