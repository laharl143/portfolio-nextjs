import type { Metadata } from "next";
import { requireStudioAccess } from "@/studio/guard";
import { createSystemAction } from "@/studio/systems/actions";
import FormPage from "../../../_components/FormPage";
import SystemForm from "../../../_components/SystemForm";

export const metadata: Metadata = {
  title: "New system · Studio",
  robots: { index: false, follow: false },
};

// Create system (spec 0008, AC-3). Published starts off, so a new system never reaches the export by accident.
export default async function NewSystemPage() {
  await requireStudioAccess();
  return (
    <FormPage backHref="/studio/systems" backLabel="All systems" eyebrow="Systems" title="New system">
      <SystemForm
        action={createSystemAction}
        initial={{ status: "planned", layer: "core", sortOrder: "0", published: "" }}
        hidden={{}}
        withSlug
        submitLabel="Create system"
        cancelHref="/studio/systems"
      />
    </FormPage>
  );
}
