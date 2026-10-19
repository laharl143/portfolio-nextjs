import type { Metadata } from "next";
import { requireStudioAccess } from "@/studio/guard";
import { applySystemsImport, previewSystemsImport } from "@/studio/systems/actions";
import FormPage from "../../../_components/FormPage";
import SystemImportForm from "../../../_components/SystemImportForm";

export const metadata: Metadata = {
  title: "Import systems · Studio",
  robots: { index: false, follow: false },
};

// Paste the SMB Systems Map export (spec 0008, AC-7 and AC-8). Nothing pasted here ever goes into the repo.
export default async function ImportSystemsPage() {
  await requireStudioAccess();
  return (
    <FormPage backHref="/studio/systems" backLabel="All systems" eyebrow="Systems" title="Import systems">
      <p className="mb-6 max-w-2xl text-sm text-stone-600 dark:text-stone-300">
        Matches systems by id and links by from and to. It never deletes, never changes Published or archived
        systems, and running the same JSON again changes nothing. Read the preview first: fields tagged Public change the
        public page after your next export.
      </p>
      <div className="max-w-4xl">
        <SystemImportForm preview={previewSystemsImport} apply={applySystemsImport} />
      </div>
    </FormPage>
  );
}
