import "server-only";
import "@/studio/marker";
import { and, eq } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import { invoiceFiles } from "@/studio/db/schema";
import { isUuid } from "./input";
import { getWorkspaceId } from "./workspace";
import { invoiceRead } from "@/studio/invoices/read";

// Invoice files (spec 0013): the one PDF frozen at send, an append only row pointing at a private Blob file.

export type InvoiceFile = typeof invoiceFiles.$inferSelect;

export function invoiceFilePathname(workspaceId: string, invoiceId: string, fileId: string): string {
  return `ws/${workspaceId}/invoices/${invoiceId}/${fileId}.pdf`;
}

export async function recordInvoiceFile(
  tx: Tx,
  file: {
    id: string;
    workspaceId: string;
    invoiceId: string;
    statusEventId: string;
    blobPathname: string;
    sizeBytes: number;
    sha256: string;
  },
): Promise<InvoiceFile> {
  const [row] = await tx.insert(invoiceFiles).values(file).returning();
  return row;
}

// Read outside any transaction after a failure: a committed row means the Blob file must stay.
export async function invoiceFileExists(fileId: string): Promise<boolean> {
  const [row] = await getDb().select({ id: invoiceFiles.id }).from(invoiceFiles).where(eq(invoiceFiles.id, fileId));
  return Boolean(row);
}

// The frozen PDF of one invoice of this workspace, or null.
export const getInvoiceFile = invoiceRead("getInvoiceFile", async function getInvoiceFile(invoiceId: string): Promise<InvoiceFile | null> {
  if (!isUuid(invoiceId)) {
    return null;
  }
  const workspaceId = await getWorkspaceId();
  const [row] = await getDb()
    .select()
    .from(invoiceFiles)
    .where(and(eq(invoiceFiles.invoiceId, invoiceId), eq(invoiceFiles.workspaceId, workspaceId)));
  return row ?? null;
});
