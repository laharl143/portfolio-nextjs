import "server-only";
import "@/studio/marker";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import { clients, contracts, projects } from "@/studio/db/schema";
import { ProjectHasLiveContracts, ProjectNotFound, StaleRecord } from "./errors";
import { isUuid, isVersion, parseProjectInput, type ProjectFormInput } from "./input";
import { lockLiveClient } from "./clients";
import { getWorkspaceId } from "./workspace";

// Projects of a client (spec 0006, AC-8). Lock order: client row, then project row.

export type Project = typeof projects.$inferSelect;

async function lockProject(tx: Tx, clientId: string, projectId: string, workspaceId: string) {
  if (!isUuid(projectId)) {
    throw new ProjectNotFound();
  }
  const [project] = await tx
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, clientId), eq(projects.workspaceId, workspaceId)))
    .for("update");
  if (!project) {
    throw new ProjectNotFound();
  }
  return project;
}

export async function getProjectForEdit(clientId: string, projectId: string) {
  if (!isUuid(clientId) || !isUuid(projectId)) {
    throw new ProjectNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [row] = await getDb()
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      description: projects.description,
      startDate: projects.startDate,
      targetEndDate: projects.targetEndDate,
      actualEndDate: projects.actualEndDate,
      version: sql<string>`${projects.updatedAt}::text`,
      clientName: clients.name,
      clientArchivedAt: clients.archivedAt,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.clientId, clientId),
        eq(projects.workspaceId, workspaceId),
        eq(clients.workspaceId, workspaceId),
        isNull(projects.archivedAt),
      ),
    );
  if (!row) {
    throw new ProjectNotFound();
  }
  return row;
}

export async function createProject(clientId: string, input: ProjectFormInput): Promise<Project> {
  const values = parseProjectInput(input);
  return getDb().transaction(async (tx) => {
    const client = await lockLiveClient(tx, clientId);
    const [project] = await tx
      .insert(projects)
      .values({ workspaceId: client.workspaceId, clientId: client.id, ...values })
      .returning();
    return project;
  });
}

export async function updateProject(
  clientId: string,
  projectId: string,
  version: string,
  input: ProjectFormInput,
): Promise<Project> {
  const values = parseProjectInput(input);
  return getDb().transaction(async (tx) => {
    const client = await lockLiveClient(tx, clientId);
    const project = await lockProject(tx, client.id, projectId, client.workspaceId);
    if (project.archivedAt) {
      throw new ProjectNotFound();
    }
    if (!isVersion(version)) {
      throw new StaleRecord();
    }
    const [updated] = await tx
      .update(projects)
      .set(values)
      .where(and(eq(projects.id, project.id), sql`${projects.updatedAt} = ${version}::timestamptz`))
      .returning();
    if (!updated) {
      throw new StaleRecord();
    }
    return updated;
  });
}

// Refused while a signed or active contract of this project exists. An archived project comes back unchanged.
export async function archiveProject(clientId: string, projectId: string): Promise<Project> {
  return getDb().transaction(async (tx) => {
    const client = await lockLiveClient(tx, clientId);
    const project = await lockProject(tx, client.id, projectId, client.workspaceId);
    if (project.archivedAt) {
      return project;
    }
    const [live] = await tx
      .select({ id: contracts.id })
      .from(contracts)
      .where(
        and(
          eq(contracts.projectId, project.id),
          eq(contracts.workspaceId, client.workspaceId),
          inArray(contracts.status, ["signed", "active"]),
          isNull(contracts.archivedAt),
        ),
      )
      .limit(1);
    if (live) {
      throw new ProjectHasLiveContracts();
    }
    const [archived] = await tx
      .update(projects)
      .set({ archivedAt: sql`now()` })
      .where(eq(projects.id, project.id))
      .returning();
    return archived;
  });
}
