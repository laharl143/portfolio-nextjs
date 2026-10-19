import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import "@/studio/marker";
import { getDb, type Tx } from "@/studio/db/client";
import type { AuthEventKind } from "@/studio/db/constants";
import { authEvents } from "@/studio/db/schema";
import { EVENT_RETENTION_DAYS, SETUP_LOCK_ATTEMPTS, SETUP_LOCK_MINUTES } from "./config";

type EventFields = {
  ownerId?: string | null;
  passkeyId?: string | null;
  deviceLabel?: string | null;
};

// One row per auth event (spec 0005, AC-10). Never an IP address, a token, or a challenge.
export async function recordEvent(kind: AuthEventKind, fields: EventFields = {}, tx?: Tx): Promise<void> {
  await (tx ?? getDb()).insert(authEvents).values({
    kind,
    ownerId: fields.ownerId ?? null,
    passkeyId: fields.passkeyId ?? null,
    deviceLabel: fields.deviceLabel ?? null,
  });
}

// True while 5 or more setup_rejected events fall inside the last 15 minutes (spec 0005, AC-4).
export async function isSetupLocked(): Promise<boolean> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(authEvents)
    .where(
      and(
        eq(authEvents.kind, "setup_rejected"),
        gt(authEvents.createdAt, sql`now() - make_interval(mins => ${SETUP_LOCK_MINUTES})`),
      ),
    );
  return (row?.count ?? 0) >= SETUP_LOCK_ATTEMPTS;
}

export async function purgeOldEvents(): Promise<void> {
  await getDb()
    .delete(authEvents)
    .where(lt(authEvents.createdAt, sql`now() - make_interval(days => ${EVENT_RETENTION_DAYS})`));
}
