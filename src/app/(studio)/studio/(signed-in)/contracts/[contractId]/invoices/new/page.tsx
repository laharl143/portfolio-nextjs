import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getNewInvoiceDefaults } from "@/studio/data/invoices";
import { requireStudioAccess } from "@/studio/guard";
import { createInvoiceAction } from "@/studio/invoices/actions";
import FormPage from "../../../../../_components/FormPage";
import InvoiceForm from "../../../../../_components/InvoiceForm";

export const metadata: Metadata = {
  title: "New invoice · Studio",
  robots: { index: false, follow: false },
};

// New invoice (spec 0013, AC-2), prefilled from the contract, the billing profile, and the client's last invoice.
// A contract that cannot be invoiced goes back to its page.
export default async function NewInvoicePage({ params }: { params: Promise<{ contractId: string }> }) {
  await requireStudioAccess();
  const { contractId } = await params;

  let defaults: Awaited<ReturnType<typeof getNewInvoiceDefaults>>;
  try {
    defaults = await getNewInvoiceDefaults(contractId);
  } catch (err) {
    notFoundOr(err);
  }
  const { contract, client } = defaults;
  const contractHref = `/studio/contracts/${contract.id}`;
  if (!defaults.invoiceable) {
    redirect(contractHref);
  }

  return (
    <FormPage backHref={contractHref} backLabel={contract.title} eyebrow={`Invoice · ${client.name}`} title="New invoice">
      <p className="-mt-4 mb-6 max-w-xl text-sm text-stone-600 dark:text-stone-300">
        Saved as a draft. The number and dates are set when you mark it sent.
      </p>
      <InvoiceForm
        action={createInvoiceAction}
        initial={defaults.initial}
        hidden={{ contractId: contract.id }}
        currency={contract.currency}
        submitLabel="Save draft"
        cancelHref={contractHref}
      />
    </FormPage>
  );
}
