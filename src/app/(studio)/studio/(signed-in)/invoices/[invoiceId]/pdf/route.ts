import { notFound } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { pdfResponse } from "@/studio/contracts/file-response";
import { getInvoiceFile } from "@/studio/data/invoice-files";
import { getInvoiceView, renderDraftInvoicePdf, type InvoiceView } from "@/studio/data/invoices";
import { requireStudioAccess } from "@/studio/guard";
import { getPrivateFile } from "@/studio/storage/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// "Download PDF" (spec 0013, AC-6, AC-7, AC-13): a draft renders on demand and is never stored; any other invoice
// returns its frozen PDF byte for byte, and a missing file is a 404, never a fallback render.
export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  await requireStudioAccess();
  const { invoiceId } = await params;

  let view: InvoiceView;
  try {
    view = await getInvoiceView(invoiceId);
  } catch (err) {
    notFoundOr(err);
  }
  const { invoice } = view;

  if (invoice.status !== "draft") {
    const file = await getInvoiceFile(invoice.id);
    // A Blob read that throws counts as missing too.
    const stream = file ? await getPrivateFile(file.blobPathname).catch(() => null) : null;
    if (!file || !stream || !invoice.number) {
      console.error("[studio] invoice pdf route", "FILE_MISSING");
      notFound();
    }
    return pdfResponse(stream, { filename: `${invoice.number}.pdf`, disposition: "inline", size: file.sizeBytes });
  }

  try {
    const bytes = await renderDraftInvoicePdf(view);
    return pdfResponse(bytes, {
      filename: `invoice-draft-${invoice.id.slice(0, 8)}.pdf`,
      disposition: "inline",
      size: bytes.length,
    });
  } catch (err) {
    console.error("[studio] invoice pdf route", err instanceof Error && "code" in err ? err.code : "UNEXPECTED");
    throw err;
  }
}
