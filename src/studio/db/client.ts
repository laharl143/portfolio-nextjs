import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import "@/studio/marker";
import * as schema from "./schema";

// Neon over WebSocket (spec 0003): supports transactions, unlike the HTTP driver.
// One pool per server instance, created on first use so a missing DATABASE_URL never breaks the public build.
let pool: Pool | undefined;
let db: ReturnType<typeof createDb> | undefined;

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  pool = new Pool({ connectionString });
  return drizzle({ client: pool, schema });
}

export function getDb() {
  db ??= createDb();
  return db;
}

export type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Ends the pool so a script (the seed) can exit. The app never calls this.
export async function closeDb(): Promise<void> {
  const current = pool;
  pool = undefined;
  db = undefined;
  await current?.end();
}
