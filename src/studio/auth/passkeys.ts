import "server-only";
import { count, eq } from "drizzle-orm";
import "@/studio/marker";
import { getDb } from "@/studio/db/client";
import { passkeys } from "@/studio/db/schema";

// Caller guarded (the security page, or an action that already called requireStudioAccess()).
export async function countPasskeys(ownerId: string): Promise<number> {
  const [row] = await getDb().select({ value: count() }).from(passkeys).where(eq(passkeys.ownerId, ownerId));
  return row?.value ?? 0;
}
