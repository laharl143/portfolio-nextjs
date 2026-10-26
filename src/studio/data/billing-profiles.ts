import "server-only";
import "@/studio/marker";
import { eq, sql } from "drizzle-orm";
import { getDb, type Db, type Tx } from "@/studio/db/client";
import { billingProfiles } from "@/studio/db/schema";
import { StaleRecord } from "./errors";
import { isVersion, parseBillingProfileInput, type BillingProfileFormInput } from "./input";
import { getWorkspaceId } from "./workspace";
import { invoiceRead } from "@/studio/invoices/read";

// The billing profile (spec 0013, AC-1): one per workspace, your business and payment details. Confidential, so it
// lives only in the database and never reaches logs.

export type BillingProfile = typeof billingProfiles.$inferSelect;

export const DEFAULT_PAYMENT_TERMS_DAYS = 15;

export async function readBillingProfile(
  q: Db | Tx,
  workspaceId: string,
): Promise<{ profile: BillingProfile; version: string } | null> {
  const [row] = await q
    .select({ profile: billingProfiles, version: sql<string>`${billingProfiles.updatedAt}::text` })
    .from(billingProfiles)
    .where(eq(billingProfiles.workspaceId, workspaceId));
  return row ?? null;
}

export const getBillingProfile = invoiceRead("getBillingProfile", async function getBillingProfile() {
  return readBillingProfile(getDb(), await getWorkspaceId());
});

// The first save inserts (an empty version); a row already there means another save won, so it is stale.
// Later saves update at the exact version the form saw.
export async function saveBillingProfile(version: string, input: BillingProfileFormInput): Promise<BillingProfile> {
  const values = parseBillingProfileInput(input);
  const workspaceId = await getWorkspaceId();
  const db = getDb();
  if (!version) {
    const [created] = await db
      .insert(billingProfiles)
      .values({ workspaceId, ...values })
      .onConflictDoNothing({ target: billingProfiles.workspaceId })
      .returning();
    if (!created) {
      throw new StaleRecord();
    }
    return created;
  }
  if (!isVersion(version)) {
    throw new StaleRecord();
  }
  const [updated] = await db
    .update(billingProfiles)
    .set(values)
    .where(sql`${billingProfiles.workspaceId} = ${workspaceId} and ${billingProfiles.updatedAt} = ${version}::timestamptz`)
    .returning();
  if (!updated) {
    throw new StaleRecord();
  }
  return updated;
}
