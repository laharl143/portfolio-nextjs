import type { Metadata } from "next";
import { getBillingProfile, DEFAULT_PAYMENT_TERMS_DAYS } from "@/studio/data/billing-profiles";
import { requireStudioAccess } from "@/studio/guard";
import { saveBillingProfileAction } from "@/studio/invoices/actions";
import BillingProfileForm from "../../../_components/BillingProfileForm";
import FormPage from "../../../_components/FormPage";

export const metadata: Metadata = {
  title: "Billing profile · Studio",
  robots: { index: false, follow: false },
};

// Your billing profile (spec 0013, AC-1): empty with the defaults until the first save.
export default async function BillingProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStudioAccess();
  const [saved, params] = await Promise.all([getBillingProfile(), searchParams]);
  const profile = saved?.profile;

  return (
    <FormPage backHref="/studio/invoices" backLabel="Invoices" eyebrow="Invoices" title="Billing profile">
      <p className="-mt-4 mb-6 max-w-xl text-sm text-stone-600 dark:text-stone-300">
        These details print on every invoice. They stay in the studio database, never in the public site.
      </p>
      {params.saved === "1" && (
        <p
          role="status"
          className="mb-6 max-w-xl rounded-lg border border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100"
        >
          Billing profile saved.
        </p>
      )}
      <BillingProfileForm
        action={saveBillingProfileAction}
        version={saved?.version ?? ""}
        initial={{
          businessName: profile?.businessName ?? "",
          address: profile?.address ?? "",
          tin: profile?.tin ?? "",
          email: profile?.email ?? "",
          phone: profile?.phone ?? "",
          paymentInstructions: profile?.paymentInstructions ?? "",
          taxNote: profile?.taxNote ?? "",
          documentTitle: profile?.documentTitle ?? "Invoice",
          defaultPaymentTermsDays: String(profile?.defaultPaymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS),
        }}
      />
    </FormPage>
  );
}
