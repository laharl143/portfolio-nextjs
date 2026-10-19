import { notFound } from "next/navigation";
import { notFoundOr } from "@/studio/clients/page-errors";
import { pdfResponse } from "@/studio/contracts/file-response";
import { getContractFile } from "@/studio/data/contract-files";
import { getContractView, type ContractView } from "@/studio/data/contracts";
import { slugify } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import { getPrivateFile } from "@/studio/storage/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// One stored file of a contract (spec 0007, AC-8, AC-11), streamed from private Blob. File ids of another contract
// or workspace, and malformed ids, are not found.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contractId: string; fileId: string }> },
) {
  await requireStudioAccess();
  const { contractId, fileId } = await params;

  let view: ContractView;
  let file: Awaited<ReturnType<typeof getContractFile>>;
  try {
    view = await getContractView(contractId);
    file = await getContractFile(view.contract.id, fileId);
  } catch (err) {
    notFoundOr(err);
  }

  const stream = await getPrivateFile(file.blobPathname);
  if (!stream) {
    console.error("[studio] contract file route", "FILE_MISSING");
    notFound();
  }
  const slug = slugify(view.contract.title);
  const signed = file.kind === "signed_copy";
  return pdfResponse(stream, {
    filename: `${slug}-${signed ? "signed" : "sent"}-${file.ordinal}.pdf`,
    disposition: signed ? "attachment" : "inline",
    size: file.sizeBytes,
  });
}
