import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import { IntakeError } from "./rules";

export { getDb };
export async function rows<T>(
  db: Pick<Tx, "execute">,
  query: SQL,
): Promise<T[]> {
  return (await db.execute(query)).rows as T[];
}
export async function workspaceLock(tx: Tx, workspaceId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`inquiry:${workspaceId}`},0))`,
  );
}
export async function validateWorkspace(
  workspaceId: string,
  maintenance = false,
) {
  const found = await rows(
    getDb(),
    sql`select 1 from studio.workspace_members where workspace_id=${workspaceId}::uuid and role='owner' limit 1`,
  );
  if (!found.length) throw new IntakeError("UNAVAILABLE", 503);
  if (maintenance)
    await getDb().execute(
      sql`insert into studio.inquiry_maintenance(workspace_id) values(${workspaceId}::uuid) on conflict do nothing`,
    );
}
