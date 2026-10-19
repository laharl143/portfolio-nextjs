import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import "@/studio/marker";
import * as schema from "./schema";

// Neon over WebSocket (spec 0003): supports transactions, unlike the HTTP driver.
// One pool per server instance, created on first use so a missing DATABASE_URL never breaks the public build.
let db: ReturnType<typeof createDb> | undefined;

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle({ client: new Pool({ connectionString }), schema });
}

export function getDb() {
  db ??= createDb();
  return db;
}
