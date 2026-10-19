import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { asc, and, eq, gt, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import "@/studio/marker";
import { getDb, type Tx } from "@/studio/db/client";
import { sessions, workspaceMembers } from "@/studio/db/schema";
import { SESSION_DAYS, SESSION_SLIDE_AFTER_HOURS } from "./config";
import { sessionCookieName, sessionCookieOptions } from "./cookie";

export type StudioSession = {
  sessionId: string;
  ownerId: string;
  workspaceId: string;
};

const SLIDE_AFTER_MS = SESSION_SLIDE_AFTER_HOURS * 60 * 60 * 1000;

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

// Only this hash is stored; a database leak gives no usable cookie.
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(sessionCookieName())?.value ?? null;
}

// Cookies can only be written in actions, route handlers, and the proxy. Call these from actions only.
export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(sessionCookieName(), token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(sessionCookieName(), "", sessionCookieOptions(0));
}

// The signed in session for this request, or null. Deduped per request. Never writes a cookie.
// A failed lookup throws (fail closed); a failed slide write is ignored so a database hiccup never signs you out.
export const getStudioSession = cache(async (): Promise<StudioSession | null> => {
  const token = await readSessionToken();
  if (!token) {
    return null;
  }
  const db = getDb();
  const [row] = await db
    .select({
      sessionId: sessions.id,
      ownerId: sessions.ownerId,
      workspaceId: sessions.workspaceId,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);
  if (!row) {
    return null;
  }
  if (Date.now() - row.lastSeenAt.getTime() > SLIDE_AFTER_MS) {
    try {
      await db
        .update(sessions)
        .set({ lastSeenAt: sql`now()`, expiresAt: sql`now() + make_interval(days => ${SESSION_DAYS})` })
        .where(eq(sessions.id, row.sessionId));
    } catch {
      // Ignored on purpose (spec 0005, Slide write failure).
    }
  }
  return { sessionId: row.sessionId, ownerId: row.ownerId, workspaceId: row.workspaceId };
});

// The owner's workspace for a new session: the oldest membership (one row today).
async function membershipWorkspaceId(tx: Tx, ownerId: string): Promise<string> {
  const [member] = await tx
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.ownerId, ownerId))
    .orderBy(asc(workspaceMembers.createdAt))
    .limit(1);
  if (!member) {
    throw new Error("the owner has no workspace membership");
  }
  return member.workspaceId;
}

export async function insertSession(tx: Tx, ownerId: string, token: string, deviceLabel: string): Promise<void> {
  await tx.insert(sessions).values({
    tokenHash: hashSessionToken(token),
    ownerId,
    workspaceId: await membershipWorkspaceId(tx, ownerId),
    deviceLabel,
    expiresAt: sql`now() + make_interval(days => ${SESSION_DAYS})`,
  });
}

export async function deleteExpiredSessions(): Promise<void> {
  await getDb().delete(sessions).where(lt(sessions.expiresAt, sql`now()`));
}
