import "server-only";
import "@/studio/marker";
import { and, eq, sql } from "drizzle-orm";
import type { Db, Tx } from "@/studio/db/client";
import { invoiceNumberCounters } from "@/studio/db/schema";

// Gapless invoice numbers (spec 0013, AC-8): one counter per workspace and issue year, moved only inside the send
// transaction, so a rolled back send never leaves a gap.

export function formatInvoiceNumber(year: number, n: number): string {
  return `INV-${year}-${String(n).padStart(4, "0")}`;
}

// The number the next send would take, for rendering the PDF before the transaction. Not a reservation.
export async function peekNextNumber(q: Db | Tx, workspaceId: string, year: number): Promise<number> {
  const [row] = await q
    .select({ lastNumber: invoiceNumberCounters.lastNumber })
    .from(invoiceNumberCounters)
    .where(and(eq(invoiceNumberCounters.workspaceId, workspaceId), eq(invoiceNumberCounters.year, year)));
  return (row?.lastNumber ?? 0) + 1;
}

// Takes the next number and locks the counter row until the transaction ends, so racing sends queue here.
export async function takeNumber(tx: Tx, workspaceId: string, year: number): Promise<number> {
  const [row] = await tx
    .insert(invoiceNumberCounters)
    .values({ workspaceId, year, lastNumber: 1 })
    .onConflictDoUpdate({
      target: [invoiceNumberCounters.workspaceId, invoiceNumberCounters.year],
      set: { lastNumber: sql`${invoiceNumberCounters.lastNumber} + 1`, updatedAt: sql`now()` },
    })
    .returning({ lastNumber: invoiceNumberCounters.lastNumber });
  return row.lastNumber;
}
