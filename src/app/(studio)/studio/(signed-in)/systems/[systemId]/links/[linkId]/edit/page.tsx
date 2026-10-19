import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getSystemLinkForEdit } from "@/studio/data/system-links";
import { requireStudioAccess } from "@/studio/guard";
import { deleteSystemLinkAction, updateSystemLinkAction } from "@/studio/systems/actions";
import ConfirmSubmit from "../../../../../../_components/ConfirmSubmit";
import FormPage from "../../../../../../_components/FormPage";
import SystemLinkForm from "../../../../../../_components/SystemLinkForm";

export const metadata: Metadata = {
  title: "Edit link · Studio",
  robots: { index: false, follow: false },
};

// Edit a link's label and state, or delete it (spec 0008, AC-5). Either end archived makes it read only.
export default async function EditSystemLinkPage({ params }: { params: Promise<{ systemId: string; linkId: string }> }) {
  await requireStudioAccess();
  const { systemId, linkId } = await params;

  let link: Awaited<ReturnType<typeof getSystemLinkForEdit>>;
  try {
    link = await getSystemLinkForEdit(systemId, linkId);
  } catch (err) {
    notFoundOr(err);
  }
  const detailHref = `/studio/systems/${link.fromId}`;
  if (link.fromArchivedAt || link.toArchivedAt) {
    redirect(detailHref);
  }

  return (
    <FormPage backHref={detailHref} backLabel={link.fromName} eyebrow={link.fromName} title={`Link to ${link.toName}`}>
      <SystemLinkForm
        action={updateSystemLinkAction}
        initial={{ label: link.label, state: link.state }}
        hidden={{ systemId: link.fromId, linkId: link.id, version: link.version }}
        submitLabel="Save link"
        cancelHref={detailHref}
        reloadHref={`${detailHref}/links/${link.id}/edit`}
      />
      <div className="mt-10">
        <ConfirmSubmit
          action={deleteSystemLinkAction}
          fields={{ systemId: link.fromId, linkId: link.id }}
          triggerLabel="Delete link"
          title="Delete this link?"
          description="The link is removed for good. This cannot be undone."
          confirmLabel="Delete link"
        />
      </div>
    </FormPage>
  );
}
