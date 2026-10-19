import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { updateContractAction } from "@/studio/contracts/actions";
import type { PlaceholderValues } from "@/studio/contracts/placeholders";
import { todayText } from "@/studio/contracts/values";
import { getContractForEdit, getContractView } from "@/studio/data/contracts";
import { amountInputValue } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import ContractForm from "../../../../_components/ContractForm";
import FormPage from "../../../../_components/FormPage";

export const metadata: Metadata = {
  title: "Edit contract · Studio",
  robots: { index: false, follow: false },
};

// Draft only (spec 0007, AC-4): any other contract, an archived one, or one of an archived client goes back to its page.
export default async function EditContractPage({ params }: { params: Promise<{ contractId: string }> }) {
  await requireStudioAccess();
  const { contractId } = await params;

  let edit: Awaited<ReturnType<typeof getContractForEdit>>;
  let values: PlaceholderValues;
  try {
    edit = await getContractForEdit(contractId);
    values = (await getContractView(contractId)).values;
  } catch (err) {
    notFoundOr(err);
  }
  const { contract, client } = edit;
  const contractHref = `/studio/contracts/${contract.id}`;
  if (contract.status !== "draft" || contract.archivedAt || client.archivedAt) {
    redirect(contractHref);
  }

  return (
    <FormPage backHref={contractHref} backLabel={contract.title} eyebrow={`Contract · ${client.name}`} title="Edit contract">
      <p className="-mt-4 mb-6 text-sm text-stone-500 dark:text-stone-400">
        The preview fills placeholders from the saved details. Today is {todayText()}.
      </p>
      <ContractForm
        action={updateContractAction}
        initial={{
          title: contract.title,
          projectId: contract.projectId ?? "",
          amount: amountInputValue(contract.amountMinor),
          billingCadence: contract.billingCadence ?? "",
          startDate: contract.startDate ?? "",
          endDate: contract.endDate ?? "",
          termsSummary: contract.termsSummary ?? "",
          body: contract.body,
        }}
        hidden={{ contractId: contract.id, version: edit.version }}
        projects={edit.projects.map((project) => ({
          value: project.id,
          label: project.archivedAt ? `${project.name} (archived)` : project.name,
        }))}
        values={values}
        submitLabel="Save changes"
        cancelHref={contractHref}
        reloadHref={`${contractHref}/edit`}
      />
    </FormPage>
  );
}
