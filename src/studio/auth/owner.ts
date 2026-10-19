import "server-only";
import { eq } from "drizzle-orm";
import "@/studio/marker";
import { getDb } from "@/studio/db/client";
import { owners } from "@/studio/db/schema";

// Caller guarded. The name shown in the studio header and in the passkey prompt.
export async function getOwnerDisplayName(ownerId: string): Promise<string | null> {
  const [owner] = await getDb()
    .select({ displayName: owners.displayName })
    .from(owners)
    .where(eq(owners.id, ownerId))
    .limit(1);
  return owner?.displayName ?? null;
}
