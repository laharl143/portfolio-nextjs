import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read Next's env files on its own; load them in dev mode so
// .env.development.local (the Neon dev branch) wins, as it does for `next dev` (spec 0003).
loadEnvConfig(process.cwd(), true);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/studio/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["studio"],
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? "",
  },
  migrations: {
    schema: "studio",
    table: "__drizzle_migrations",
  },
});
