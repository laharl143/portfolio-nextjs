import type { Metadata } from "next";
import { archiveTemplateAction, updateTemplateAction } from "@/studio/contracts/actions";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getTemplate } from "@/studio/data/contract-templates";
import { requireStudioAccess } from "@/studio/guard";
import ConfirmSubmit from "../../../../_components/ConfirmSubmit";
import FormPage from "../../../../_components/FormPage";
import TemplateForm from "../../../../_components/TemplateForm";

export const metadata: Metadata = {
  title: "Edit template · Studio",
  robots: { index: false, follow: false },
};

export default async function EditTemplatePage({ params }: { params: Promise<{ templateId: string }> }) {
  await requireStudioAccess();
  const { templateId } = await params;

  let template: Awaited<ReturnType<typeof getTemplate>>;
  try {
    template = await getTemplate(templateId);
  } catch (err) {
    notFoundOr(err);
  }
  const editHref = `/studio/templates/${template.id}/edit`;

  return (
    <FormPage backHref="/studio/templates" backLabel="Templates" eyebrow="Template" title={template.name}>
      <TemplateForm
        action={updateTemplateAction}
        initial={{ name: template.name, description: template.description ?? "", body: template.body }}
        hidden={{ templateId: template.id, version: template.version }}
        submitLabel="Save changes"
        cancelHref="/studio/templates"
        reloadHref={editHref}
      />
      <section aria-labelledby="archive-template" className="mt-12 max-w-xl">
        <h2 id="archive-template" className="mb-2 text-lg font-semibold">
          Archive
        </h2>
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
          Removes it from the list and the template picker. Contracts made from it keep their own text.
        </p>
        <ConfirmSubmit
          action={archiveTemplateAction}
          fields={{ templateId: template.id }}
          triggerLabel="Archive template"
          title={`Archive ${template.name}?`}
          description="It leaves your templates and the template picker. No contract changes. There is no unarchive."
          confirmLabel="Archive template"
        />
      </section>
    </FormPage>
  );
}
