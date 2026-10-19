import { notFound } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { pdfResponse } from "@/studio/contracts/file-response";
import { getContractFile } from "@/studio/data/contract-files";
import { getContractView, renderDraftPdf, type ContractView } from "@/studio/data/contracts";
import { slugify } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import { getPrivateFile } from "@/studio/storage/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// "Download PDF" (spec 0007, AC-5, AC-6, AC-11): the latest frozen PDF byte for byte once the contract is past
// draft, else a watermarked PDF made on demand and never stored.
export async function GET(_request: Request, { params }: { params: Promise<{ contractId: string }> }) {
  await requireStudioAccess();
  const { contractId } = await params;

  let view: ContractView;
  try {
    view = await getContractView(contractId);
  } catch (err) {
    notFoundOr(err);
  }
  const slug = slugify(view.contract.title);

  if (view.frozenPdfId) {
    const file = await getContractFile(view.contract.id, view.frozenPdfId);
    const stream = await getPrivateFile(file.blobPathname);
    if (!stream) {
      console.error("[studio] contract pdf route", "FILE_MISSING");
      notFound();
    }
    return pdfResponse(stream, { filename: `${slug}.pdf`, disposition: "inline", size: file.sizeBytes });
  }

  try {
    const bytes = await renderDraftPdf(view);
    return pdfResponse(bytes, { filename: `${slug}-draft.pdf`, disposition: "inline", size: bytes.length });
  } catch (err) {
    console.error("[studio] contract pdf route", err instanceof Error && "code" in err ? err.code : "UNEXPECTED");
    throw err;
  }
}
