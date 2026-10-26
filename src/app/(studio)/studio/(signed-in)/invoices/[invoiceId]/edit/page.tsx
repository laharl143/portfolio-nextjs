import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { getInvoiceView, type InvoiceView } from "@/studio/data/invoices";
import { amountInputValue } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import { updateInvoiceAction } from "@/studio/invoices/actions";
import { formatQuantity } from "@/studio/invoices/money";
import FormPage from "../../../../_components/FormPage";
import InvoiceForm from "../../../../_components/InvoiceForm";

export const metadata: Metadata = {
  title: "Edit invoice · Studio",
  robots: { index: false, follow: false },
};

// Draft only (spec 0013, AC-5): a sent, paid, void, or discarded invoice, or one on an archived contract or client,
// goes back to its page.
export default async function EditInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  await requireStudioAccess();
  const { invoiceId } = await params;

  let view: InvoiceView;
  try {
    view = await getInvoiceView(invoiceId);
  } catch (err) {
    notFoundOr(err);
  }
  const { invoice } = view;
  const invoiceHref = `/studio/invoices/${invoice.id}`;
  if (invoice.status !== "draft" || !view.writable) {
    redirect(invoiceHref);
  }

  return (
    <FormPage backHref={invoiceHref} backLabel="Draft invoice" eyebrow={`Invoice · ${view.client.name}`} title="Edit invoice">
      <InvoiceForm
        action={updateInvoiceAction}
        initial={{
          lines: view.lines.map((line) => ({
            description: line.description,
            quantity: formatQuantity(line.quantityHundredths),
            unitPrice: amountInputValue(line.unitPriceMinor),
          })),
          paymentTermsDays: String(invoice.paymentTermsDays),
          billToAddress: invoice.billToAddress ?? "",
          notes: invoice.notes ?? "",
        }}
        hidden={{ invoiceId: invoice.id, version: view.version }}
        currency={invoice.currency}
        submitLabel="Save changes"
        cancelHref={invoiceHref}
        reloadHref={`${invoiceHref}/edit`}
      />
    </FormPage>
  );
}
