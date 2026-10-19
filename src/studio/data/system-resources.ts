import "server-only";
import "@/studio/marker";
import { and, eq, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import { systemResources, systems } from "@/studio/db/schema";
import { StaleRecord, SystemResourceNotFound } from "./errors";
import { isSystemSlug, isUuid, isVersion, parseSystemResourceInput } from "./input";
import { lockLiveSystem } from "./systems";
import { getWorkspaceId } from "./workspace";

// Private links on a system: repo, live, docs, board, other (spec 0008, AC-6). Never public. Every write locks the
// live system row first; a resource already gone counts as deleted.

export type SystemResource = typeof systemResources.$inferSelect;

type ResourceInput = { kind?: string; label?: string; url?: string };

async function lockResource(tx: Tx, systemId: string, resourceId: string, workspaceId: string) {
  if (!isUuid(resourceId)) {
    return undefined;
  }
  const [resource] = await tx
    .select()
    .from(systemResources)
    .where(
      and(
        eq(systemResources.id, resourceId),
        eq(systemResources.systemId, systemId),
        eq(systemResources.workspaceId, workspaceId),
      ),
    )
    .for("update");
  return resource;
}

export async function createSystemResource(systemId: string, input: ResourceInput): Promise<SystemResource> {
  const values = parseSystemResourceInput(input);
  return getDb().transaction(async (tx) => {
    const system = await lockLiveSystem(tx, systemId);
    const [resource] = await tx
      .insert(systemResources)
      .values({ workspaceId: system.workspaceId, systemId: system.id, ...values })
      .returning();
    return resource;
  });
}

export async function getSystemResourceForEdit(systemId: string, resourceId: string) {
  if (!isSystemSlug(systemId) || !isUuid(resourceId)) {
    throw new SystemResourceNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [row] = await getDb()
    .select({
      id: systemResources.id,
      kind: systemResources.kind,
      label: systemResources.label,
      url: systemResources.url,
      version: sql<string>`${systemResources.updatedAt}::text`,
      systemName: systems.name,
      systemArchivedAt: systems.archivedAt,
    })
    .from(systemResources)
    .innerJoin(systems, eq(systems.id, systemResources.systemId))
    .where(
      and(
        eq(systemResources.id, resourceId),
        eq(systemResources.systemId, systemId),
        eq(systemResources.workspaceId, workspaceId),
        eq(systems.workspaceId, workspaceId),
      ),
    );
  if (!row) {
    throw new SystemResourceNotFound();
  }
  return row;
}

export async function updateSystemResource(
  systemId: string,
  resourceId: string,
  version: string,
  input: ResourceInput,
): Promise<SystemResource> {
  const values = parseSystemResourceInput(input);
  return getDb().transaction(async (tx) => {
    const system = await lockLiveSystem(tx, systemId);
    const resource = await lockResource(tx, system.id, resourceId, system.workspaceId);
    if (!resource) {
      throw new SystemResourceNotFound();
    }
    if (!isVersion(version)) {
      throw new StaleRecord();
    }
    const [updated] = await tx
      .update(systemResources)
      .set(values)
      .where(and(eq(systemResources.id, resource.id), sql`${systemResources.updatedAt} = ${version}::timestamptz`))
      .returning();
    if (!updated) {
      throw new StaleRecord();
    }
    return updated;
  });
}

export async function deleteSystemResource(systemId: string, resourceId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    const system = await lockLiveSystem(tx, systemId);
    const resource = await lockResource(tx, system.id, resourceId, system.workspaceId);
    if (resource) {
      await tx.delete(systemResources).where(eq(systemResources.id, resource.id));
    }
  });
}
