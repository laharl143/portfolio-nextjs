import "server-only";
import "@/studio/marker";
import { alias } from "drizzle-orm/pg-core";
import { and, eq, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import { systemLinks, systems } from "@/studio/db/schema";
import {
  DuplicateLink,
  InvalidInput,
  SelfLink,
  StaleRecord,
  SystemLinkNotFound,
  SystemNotFound,
  isUniqueViolation,
} from "./errors";
import { isSystemSlug, isUuid, isVersion, parseSystemLinkInput } from "./input";
import { lockLiveSystem } from "./systems";
import { getWorkspaceId } from "./workspace";

// Directed links between systems (spec 0008, AC-5). A link belongs to its `from` system's page. Every write locks
// both ends with lockLiveSystem() in sorted id order (no deadlock), then the link; either end archived refuses it.

export type SystemLink = typeof systemLinks.$inferSelect;

const PAIR_CONSTRAINT = "system_links_from_to_uq";

async function lockBothEnds(tx: Tx, a: string, b: string) {
  const [first, second] = [a, b].sort();
  const locked = new Map([[first, await lockLiveSystem(tx, first)]]);
  locked.set(second, await lockLiveSystem(tx, second));
  return locked;
}

async function findLink(tx: Tx, systemId: string, linkId: string, workspaceId: string, lock: boolean) {
  if (!isUuid(linkId)) {
    return undefined;
  }
  const query = tx
    .select()
    .from(systemLinks)
    .where(
      and(eq(systemLinks.id, linkId), eq(systemLinks.fromSystemId, systemId), eq(systemLinks.workspaceId, workspaceId)),
    );
  const [link] = lock ? await query.for("update") : await query;
  return link;
}

export async function createSystemLink(
  fromSystemId: string,
  input: { toSystemId?: string; label?: string; state?: string },
): Promise<SystemLink> {
  const toSystemId = (input.toSystemId ?? "").trim();
  let values;
  try {
    values = parseSystemLinkInput(input);
  } catch (err) {
    if (err instanceof InvalidInput && !isSystemSlug(toSystemId)) {
      err.fieldErrors.toSystemId = "Choose a system.";
    }
    throw err;
  }
  if (!isSystemSlug(toSystemId)) {
    throw new InvalidInput({ toSystemId: "Choose a system." });
  }
  if (!isSystemSlug(fromSystemId)) {
    throw new SystemNotFound();
  }
  if (toSystemId === fromSystemId) {
    throw new SelfLink();
  }
  try {
    return await getDb().transaction(async (tx) => {
      const ends = await lockBothEnds(tx, fromSystemId, toSystemId);
      const from = ends.get(fromSystemId)!;
      const [existing] = await tx
        .select({ id: systemLinks.id })
        .from(systemLinks)
        .where(and(eq(systemLinks.fromSystemId, fromSystemId), eq(systemLinks.toSystemId, toSystemId)))
        .limit(1);
      if (existing) {
        throw new DuplicateLink();
      }
      const [link] = await tx
        .insert(systemLinks)
        .values({ workspaceId: from.workspaceId, fromSystemId, toSystemId, ...values })
        .returning();
      return link;
    });
  } catch (err) {
    if (isUniqueViolation(err, PAIR_CONSTRAINT)) {
      throw new DuplicateLink();
    }
    throw err;
  }
}

export async function getSystemLinkForEdit(systemId: string, linkId: string) {
  if (!isSystemSlug(systemId) || !isUuid(linkId)) {
    throw new SystemLinkNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const from = alias(systems, "from_system");
  const to = alias(systems, "to_system");
  const [row] = await getDb()
    .select({
      id: systemLinks.id,
      label: systemLinks.label,
      state: systemLinks.state,
      version: sql<string>`${systemLinks.updatedAt}::text`,
      fromId: from.id,
      fromName: from.name,
      fromArchivedAt: from.archivedAt,
      toId: to.id,
      toName: to.name,
      toArchivedAt: to.archivedAt,
    })
    .from(systemLinks)
    .innerJoin(from, eq(from.id, systemLinks.fromSystemId))
    .innerJoin(to, eq(to.id, systemLinks.toSystemId))
    .where(
      and(eq(systemLinks.id, linkId), eq(systemLinks.fromSystemId, systemId), eq(systemLinks.workspaceId, workspaceId)),
    );
  if (!row) {
    throw new SystemLinkNotFound();
  }
  return row;
}

export async function updateSystemLink(
  systemId: string,
  linkId: string,
  version: string,
  input: { label?: string; state?: string },
): Promise<SystemLink> {
  const values = parseSystemLinkInput(input);
  if (!isSystemSlug(systemId)) {
    throw new SystemLinkNotFound();
  }
  const workspaceId = await getWorkspaceId();
  return getDb().transaction(async (tx) => {
    const seen = await findLink(tx, systemId, linkId, workspaceId, false);
    if (!seen) {
      throw new SystemLinkNotFound();
    }
    await lockBothEnds(tx, seen.fromSystemId, seen.toSystemId);
    const link = await findLink(tx, systemId, linkId, workspaceId, true);
    if (!link) {
      throw new SystemLinkNotFound();
    }
    if (!isVersion(version)) {
      throw new StaleRecord();
    }
    const [updated] = await tx
      .update(systemLinks)
      .set(values)
      .where(and(eq(systemLinks.id, link.id), sql`${systemLinks.updatedAt} = ${version}::timestamptz`))
      .returning();
    if (!updated) {
      throw new StaleRecord();
    }
    return updated;
  });
}

// A link already gone counts as done (AC-5).
export async function deleteSystemLink(systemId: string, linkId: string): Promise<void> {
  if (!isSystemSlug(systemId)) {
    throw new SystemNotFound();
  }
  const workspaceId = await getWorkspaceId();
  await getDb().transaction(async (tx) => {
    const seen = await findLink(tx, systemId, linkId, workspaceId, false);
    if (!seen) {
      return;
    }
    await lockBothEnds(tx, seen.fromSystemId, seen.toSystemId);
    await tx
      .delete(systemLinks)
      .where(
        and(eq(systemLinks.id, seen.id), eq(systemLinks.fromSystemId, systemId), eq(systemLinks.workspaceId, workspaceId)),
      );
  });
}
