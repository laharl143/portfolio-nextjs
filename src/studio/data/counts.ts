import "server-only";
import "@/studio/marker";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/studio/db/client";
import { clients, contacts, contracts, notes, projects, systemLinks, systems } from "@/studio/db/schema";
import { getWorkspaceId } from "./workspace";

export type RecordCounts = {
  clients: number;
  contacts: number;
  projects: number;
  contracts: number;
  notes: number;
  systems: number;
  systemLinks: number;
};

// One count per entity for the shell (spec 0004, AC-8), in one round trip: the current workspace only, and for
// archivable tables only rows whose own archived_at is null. Notes and system links have no archive.
// Throws on any database error; the shell catches it and hides the counts.
export async function getRecordCounts(): Promise<RecordCounts> {
  const workspaceId = await getWorkspaceId();

  const live = (table: typeof clients | typeof contacts | typeof projects | typeof contracts | typeof systems): SQL =>
    sql`(select count(*)::int from ${table} where ${table.workspaceId} = ${workspaceId} and ${table.archivedAt} is null)`;
  const all = (table: typeof notes | typeof systemLinks): SQL =>
    sql`(select count(*)::int from ${table} where ${table.workspaceId} = ${workspaceId})`;

  const result = await getDb().execute<RecordCounts>(sql`
    select
      ${live(clients)} as "clients",
      ${live(contacts)} as "contacts",
      ${live(projects)} as "projects",
      ${live(contracts)} as "contracts",
      ${all(notes)} as "notes",
      ${live(systems)} as "systems",
      ${all(systemLinks)} as "systemLinks"
  `);

  const row = result.rows[0];
  if (!row) {
    throw new Error("record counts query returned no row");
  }
  return row;
}
