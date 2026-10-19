// Runs Drizzle migrations during the Vercel build, with the guardrails from spec 0003 (AC-6).
// Locally it never migrates: run `npm run db:migrate` against the Neon dev branch on purpose.
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

// Any fixed number works; it only has to be the same for every build so two builds never migrate at once.
const ADVISORY_LOCK_KEY = 190_003;

const vercelEnv = process.env.VERCEL_ENV;
const url = process.env.DATABASE_URL_UNPOOLED;
const studioEnabled = process.env.STUDIO_ENABLED === "true";

function hostOf(connectionString) {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
}

async function main() {
  // 1. Local build (or `vercel dev`): never migrate.
  if (!vercelEnv || vercelEnv === "development") {
    console.log("[migrate] skipping migrations (local build)");
    return;
  }

  if (vercelEnv !== "production" && vercelEnv !== "preview") {
    console.log(`[migrate] skipping migrations (unknown VERCEL_ENV "${vercelEnv}")`);
    return;
  }

  // 2. No database for this environment.
  if (!url) {
    if (studioEnabled) {
      throw new Error("DATABASE_URL_UNPOOLED is missing while STUDIO_ENABLED is true");
    }
    console.warn("[migrate] warning: DATABASE_URL_UNPOOLED is not set, skipping migrations");
    return;
  }

  // 3. Fail closed: a preview must never migrate the production branch.
  const prodHost = process.env.STUDIO_PROD_DB_HOST;
  if (vercelEnv === "preview" && prodHost && hostOf(url) === prodHost) {
    throw new Error("preview build is pointed at the production database host, refusing to migrate");
  }

  // 4. Migrate under an advisory lock, on one connection, all pending migrations in one transaction.
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    try {
      await client.query('CREATE SCHEMA IF NOT EXISTS "studio"');
      await migrate(drizzle({ client }), {
        migrationsFolder: "drizzle",
        migrationsSchema: "studio",
        migrationsTable: "__drizzle_migrations",
      });
      console.log(`[migrate] migrations applied (${vercelEnv})`);
    } finally {
      await client.query("select pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`[migrate] failed: ${error.message}`);
  process.exit(1);
});
