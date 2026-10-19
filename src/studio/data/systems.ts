import "server-only";
import "@/studio/marker";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import type { SystemLayer, SystemStatus } from "@/studio/db/constants";
import { notes, systemLinks, systemResources, systems } from "@/studio/db/schema";
import { DuplicateSystemSlug, StaleRecord, SystemArchived, SystemNotFound, isUniqueViolation } from "./errors";
import { isSystemSlug, isVersion, parseSystemInput, type SystemFormInput } from "./input";
import { getWorkspaceId } from "./workspace";

// The private systems map (spec 0008). Systems are keyed by their slug, which is the public ProductId.

export type System = typeof systems.$inferSelect;

export const SYSTEM_NOTE_PAGE_SIZE = 50;

const systemVersion = sql<string>`${systems.updatedAt}::text`;

// Locks one live system row (spec 0008, Key invariants). Every write on a system's links, resources, or notes calls
// this first; link writes lock both ends in sorted id order.
export async function lockLiveSystem(tx: Tx, systemId: string): Promise<System> {
  if (!isSystemSlug(systemId)) {
    throw new SystemNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [system] = await tx
    .select()
    .from(systems)
    .where(and(eq(systems.id, systemId), eq(systems.workspaceId, workspaceId)))
    .for("update");
  if (!system) {
    throw new SystemNotFound();
  }
  if (system.archivedAt) {
    throw new SystemArchived();
  }
  return system;
}

export type SystemCard = {
  id: string;
  name: string;
  status: SystemStatus;
  layer: SystemLayer;
  published: boolean;
  linkCount: number;
};

// The board (AC-1): live or archived systems by sort order, then id, with every link touching each one counted.
export async function listSystemBoard(opts: { archived: boolean }): Promise<{ cards: SystemCard[]; total: number }> {
  const workspaceId = await getWorkspaceId();
  // Written out with an alias: Drizzle prints columns unqualified inside a select, which makes `id` ambiguous here.
  const linkCount = sql<number>`(select count(*)::int from "studio"."system_links" l where l.workspace_id = ${workspaceId} and (l.from_system_id = "systems"."id" or l.to_system_id = "systems"."id"))`;
  const db = getDb();
  const [cards, [counted]] = await Promise.all([
    db
      .select({
        id: systems.id,
        name: systems.name,
        status: systems.status,
        layer: systems.layer,
        published: systems.published,
        linkCount,
      })
      .from(systems)
      .where(
        and(
          eq(systems.workspaceId, workspaceId),
          opts.archived ? isNotNull(systems.archivedAt) : isNull(systems.archivedAt),
        ),
      )
      .orderBy(asc(systems.sortOrder), asc(systems.id)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(systems)
      .where(eq(systems.workspaceId, workspaceId)),
  ]);
  return { cards, total: counted?.total ?? 0 };
}

async function findSystem(systemId: string) {
  if (!isSystemSlug(systemId)) {
    throw new SystemNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [system] = await getDb()
    .select({
      id: systems.id,
      name: systems.name,
      status: systems.status,
      layer: systems.layer,
      published: systems.published,
      publicSummary: systems.publicSummary,
      standalone: systems.standalone,
      sortOrder: systems.sortOrder,
      summary: systems.summary,
      lessons: systems.lessons,
      stack: systems.stack,
      archivedAt: systems.archivedAt,
      version: systemVersion,
    })
    .from(systems)
    .where(and(eq(systems.id, systemId), eq(systems.workspaceId, workspaceId)));
  if (!system) {
    throw new SystemNotFound();
  }
  return { system, workspaceId };
}

export type SystemForEdit = Awaited<ReturnType<typeof findSystem>>["system"];

export async function getSystemForEdit(systemId: string): Promise<SystemForEdit> {
  return (await findSystem(systemId)).system;
}

// One system with its connections, resources, and a page of notes, newest first (AC-2).
export async function getSystemDetail(systemId: string, notesPage: number) {
  const { system, workspaceId } = await findSystem(systemId);
  const other = alias(systems, "other_system");
  const db = getDb();

  const connection = (direction: "out" | "in") =>
    db
      .select({
        id: systemLinks.id,
        otherId: other.id,
        otherName: other.name,
        otherArchivedAt: other.archivedAt,
        label: systemLinks.label,
        state: systemLinks.state,
      })
      .from(systemLinks)
      .innerJoin(other, eq(other.id, direction === "out" ? systemLinks.toSystemId : systemLinks.fromSystemId))
      .where(
        and(
          eq(direction === "out" ? systemLinks.fromSystemId : systemLinks.toSystemId, system.id),
          eq(systemLinks.workspaceId, workspaceId),
        ),
      )
      .orderBy(asc(other.sortOrder), asc(other.id));

  const [sendsTo, receivesFrom, resources, noteRows, [noteCount]] = await Promise.all([
    connection("out"),
    connection("in"),
    db
      .select({
        id: systemResources.id,
        kind: systemResources.kind,
        label: systemResources.label,
        url: systemResources.url,
      })
      .from(systemResources)
      .where(and(eq(systemResources.systemId, system.id), eq(systemResources.workspaceId, workspaceId)))
      .orderBy(asc(systemResources.kind), sql`lower(${systemResources.label})`, asc(systemResources.id)),
    db
      .select({ id: notes.id, body: notes.body, createdAt: notes.createdAt, updatedAt: notes.updatedAt })
      .from(notes)
      .where(and(eq(notes.systemId, system.id), eq(notes.workspaceId, workspaceId)))
      .orderBy(desc(notes.createdAt), desc(notes.id))
      .limit(SYSTEM_NOTE_PAGE_SIZE)
      .offset((notesPage - 1) * SYSTEM_NOTE_PAGE_SIZE),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(notes)
      .where(and(eq(notes.systemId, system.id), eq(notes.workspaceId, workspaceId))),
  ]);

  return {
    system,
    sendsTo,
    receivesFrom,
    resources,
    notes: noteRows,
    noteTotal: noteCount?.total ?? 0,
    notesPage,
  };
}

export type SystemDetail = Awaited<ReturnType<typeof getSystemDetail>>;

// Live systems this one may send a new link to (AC-5): every other live system.
export async function listLinkTargets(systemId: string): Promise<{ id: string; name: string }[]> {
  const workspaceId = await getWorkspaceId();
  return getDb()
    .select({ id: systems.id, name: systems.name })
    .from(systems)
    .where(and(eq(systems.workspaceId, workspaceId), isNull(systems.archivedAt), ne(systems.id, systemId)))
    .orderBy(sql`lower(${systems.name})`, asc(systems.id));
}

const PK_CONSTRAINT = "systems_pkey";

export async function createSystem(input: SystemFormInput): Promise<System> {
  const { id, ...values } = parseSystemInput(input, { withSlug: true });
  const workspaceId = await getWorkspaceId();
  try {
    return await getDb().transaction(async (tx) => {
      // The slug is a global key (spec 0004), so any row with it, in any state, takes it.
      const [taken] = await tx.select({ id: systems.id }).from(systems).where(eq(systems.id, id!)).limit(1);
      if (taken) {
        throw new DuplicateSystemSlug();
      }
      const [system] = await tx
        .insert(systems)
        .values({ id: id!, workspaceId, ...values })
        .returning();
      return system;
    });
  } catch (err) {
    if (isUniqueViolation(err, PK_CONSTRAINT)) {
      throw new DuplicateSystemSlug();
    }
    throw err;
  }
}

// Applies only to the exact version the form saw (AC-3). The slug never changes.
export async function updateSystem(systemId: string, version: string, input: SystemFormInput): Promise<System> {
  const values = parseSystemInput(input, { withSlug: false });
  return getDb().transaction(async (tx) => {
    const system = await lockLiveSystem(tx, systemId);
    if (!isVersion(version)) {
      throw new StaleRecord();
    }
    const [updated] = await tx
      .update(systems)
      .set(values)
      .where(and(eq(systems.id, system.id), sql`${systems.updatedAt} = ${version}::timestamptz`))
      .returning();
    if (!updated) {
      throw new StaleRecord();
    }
    return updated;
  });
}

// Archive and restore (AC-4). Archiving an archived row, or restoring a live one, returns it unchanged.
async function setArchived(systemId: string, archived: boolean): Promise<System> {
  if (!isSystemSlug(systemId)) {
    throw new SystemNotFound();
  }
  const workspaceId = await getWorkspaceId();
  return getDb().transaction(async (tx) => {
    const [system] = await tx
      .select()
      .from(systems)
      .where(and(eq(systems.id, systemId), eq(systems.workspaceId, workspaceId)))
      .for("update");
    if (!system) {
      throw new SystemNotFound();
    }
    if (Boolean(system.archivedAt) === archived) {
      return system;
    }
    const [changed] = await tx
      .update(systems)
      .set({ archivedAt: archived ? sql`now()` : null })
      .where(eq(systems.id, system.id))
      .returning();
    return changed;
  });
}

export function archiveSystem(systemId: string): Promise<System> {
  return setArchived(systemId, true);
}

export function restoreSystem(systemId: string): Promise<System> {
  return setArchived(systemId, false);
}
