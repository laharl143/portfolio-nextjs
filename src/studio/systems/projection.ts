import "server-only";
import "@/studio/marker";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/studio/db/client";
import type { SystemLinkState, SystemStatus } from "@/studio/db/constants";
import { systemLinks, systems } from "@/studio/db/schema";
import { getWorkspaceId } from "@/studio/data/workspace";

// The only door from the database to the public file (spec 0008, Key invariants). These queries select public
// columns only, so a private field can never reach the export or the drift banner: it is never read.

export type PublicSystem = {
  id: string;
  name: string;
  status: SystemStatus;
  summary: string;
  standalone: boolean;
  sortOrder: number;
};

export type PublicLink = { from: string; to: string; label: string; state: SystemLinkState };

export type PublicProjection = { systems: PublicSystem[]; links: PublicLink[] };

// Published live systems by sort order, then id; links whose two ends are both in that set, by the from system's
// sort order, then the to system's, then label (ids break sort order ties).
export async function getPublicProjection(): Promise<PublicProjection> {
  const workspaceId = await getWorkspaceId();
  const exported = and(eq(systems.workspaceId, workspaceId), eq(systems.published, true), isNull(systems.archivedAt));
  const from = alias(systems, "from_system");
  const to = alias(systems, "to_system");
  const db = getDb();

  const [systemRows, links] = await Promise.all([
    db
      .select({
        id: systems.id,
        name: systems.name,
        status: systems.status,
        summary: systems.publicSummary,
        standalone: systems.standalone,
        sortOrder: systems.sortOrder,
      })
      .from(systems)
      .where(exported)
      .orderBy(asc(systems.sortOrder), asc(systems.id)),
    db
      .select({ from: systemLinks.fromSystemId, to: systemLinks.toSystemId, label: systemLinks.label, state: systemLinks.state })
      .from(systemLinks)
      .innerJoin(from, eq(from.id, systemLinks.fromSystemId))
      .innerJoin(to, eq(to.id, systemLinks.toSystemId))
      .where(
        and(
          eq(systemLinks.workspaceId, workspaceId),
          eq(from.workspaceId, workspaceId),
          eq(from.published, true),
          isNull(from.archivedAt),
          eq(to.workspaceId, workspaceId),
          eq(to.published, true),
          isNull(to.archivedAt),
        ),
      )
      .orderBy(asc(from.sortOrder), asc(from.id), asc(to.sortOrder), asc(to.id), asc(systemLinks.label)),
  ]);

  return { systems: systemRows, links };
}
