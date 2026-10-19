import "server-only";
import "@/studio/marker";
import { sql } from "drizzle-orm";
import { getDb } from "./client";

export type DatabaseStatus =
  | { state: "not-connected" }
  | { state: "not-migrated" }
  | { state: "migrated"; count: number };

// Sources for the shell's database line (spec 0003, Value sourcing). No error text ever reaches the page.
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
    await db.execute(sql`select 1`);
  } catch {
    return { state: "not-connected" };
  }

  try {
    const journal = await db.execute<{ journal: string | null }>(
      sql`select to_regclass('studio.__drizzle_migrations')::text as journal`,
    );
    if (!journal.rows[0]?.journal) {
      return { state: "not-migrated" };
    }
    const applied = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from studio.__drizzle_migrations`,
    );
    return { state: "migrated", count: applied.rows[0]?.count ?? 0 };
  } catch {
    return { state: "not-connected" };
  }
}
