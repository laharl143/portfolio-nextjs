import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import "@/studio/marker";
import { getDb } from "@/studio/db/client";
import type { ChallengePurpose } from "@/studio/db/constants";
import { authChallenges } from "@/studio/db/schema";
import { CHALLENGE_MINUTES } from "./config";
import { CHALLENGE_COOKIE, challengeCookieOptions } from "./cookie";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Stores a fresh challenge and points the challenge cookie at it. Expired rows go on every insert.
export async function saveChallenge(purpose: ChallengePurpose, ownerId: string | null, challenge: string): Promise<void> {
  const db = getDb();
  await db.delete(authChallenges).where(lt(authChallenges.expiresAt, sql`now()`));
  const [row] = await db
    .insert(authChallenges)
    .values({
      challenge,
      purpose,
      ownerId,
      expiresAt: sql`now() + make_interval(mins => ${CHALLENGE_MINUTES})`,
    })
    .returning({ id: authChallenges.id });
  (await cookies()).set(CHALLENGE_COOKIE, row.id, challengeCookieOptions(CHALLENGE_MINUTES * 60));
}

// One use: a single delete ... returning, so two parallel verifies cannot both get the challenge.
// The cookie is cleared whatever the outcome.
export async function consumeChallenge(purpose: ChallengePurpose): Promise<string | null> {
  const jar = await cookies();
  const id = jar.get(CHALLENGE_COOKIE)?.value;
  jar.set(CHALLENGE_COOKIE, "", challengeCookieOptions(0));
  if (!id || !UUID.test(id)) {
    return null;
  }
  const [row] = await getDb()
    .delete(authChallenges)
    .where(
      and(eq(authChallenges.id, id), eq(authChallenges.purpose, purpose), gt(authChallenges.expiresAt, sql`now()`)),
    )
    .returning({ challenge: authChallenges.challenge });
  return row?.challenge ?? null;
}
