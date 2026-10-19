import "server-only";
import "@/studio/marker";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import type { ContractFileKind } from "@/studio/db/constants";
import { contractFiles } from "@/studio/db/schema";
import { ContractFileNotFound } from "./errors";
import { isUuid } from "./input";
import { getWorkspaceId } from "./workspace";

// Contract files (spec 0007): append only rows (a trigger rejects update and delete) pointing at private Blob files.

export type ContractFile = typeof contractFiles.$inferSelect;

export function contractFilePathname(workspaceId: string, contractId: string, fileId: string): string {
  return `ws/${workspaceId}/contracts/${contractId}/${fileId}.pdf`;
}

export async function recordContractFile(
  tx: Tx,
  file: {
    id: string;
    workspaceId: string;
    contractId: string;
    kind: ContractFileKind;
    statusEventId: string | null;
    blobPathname: string;
    sizeBytes: number;
    sha256: string;
  },
): Promise<ContractFile> {
  const [row] = await tx.insert(contractFiles).values(file).returning();
  return row;
}

// Read outside any transaction after a failure: a committed row means the Blob file must stay.
export async function contractFileExists(fileId: string): Promise<boolean> {
  const [row] = await getDb().select({ id: contractFiles.id }).from(contractFiles).where(eq(contractFiles.id, fileId));
  return Boolean(row);
}

// The newest frozen PDF of a contract, or null.
export async function latestSentPdf(contractId: string): Promise<ContractFile | null> {
  if (!isUuid(contractId)) {
    return null;
  }
  const workspaceId = await getWorkspaceId();
  const [row] = await getDb()
    .select()
    .from(contractFiles)
    .where(
      and(
        eq(contractFiles.contractId, contractId),
        eq(contractFiles.workspaceId, workspaceId),
        eq(contractFiles.kind, "sent_pdf"),
      ),
    )
    .orderBy(desc(contractFiles.createdAt), desc(contractFiles.id))
    .limit(1);
  return row ?? null;
}

// One file of one contract, with its chronological ordinal among files of its kind (the oldest is 1).
// Matches id, contract, and workspace together; anything else is not found.
export async function getContractFile(contractId: string, fileId: string): Promise<ContractFile & { ordinal: number }> {
  if (!isUuid(contractId) || !isUuid(fileId)) {
    throw new ContractFileNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const rows = await getDb()
    .select()
    .from(contractFiles)
    .where(and(eq(contractFiles.contractId, contractId), eq(contractFiles.workspaceId, workspaceId)))
    .orderBy(asc(contractFiles.createdAt), asc(contractFiles.id));
  const file = rows.find((row) => row.id === fileId);
  if (!file) {
    throw new ContractFileNotFound();
  }
  const ordinal = rows.filter((row) => row.kind === file.kind).findIndex((row) => row.id === file.id) + 1;
  return { ...file, ordinal };
}
