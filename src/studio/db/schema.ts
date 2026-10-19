import { pgSchema } from "drizzle-orm/pg-core";

// Every studio table lives in the Postgres schema `studio` (spec 0003, AC-7).
// Feature 20 (studio data model) adds the tables here, e.g. `studio.table("clients", { ... })`.
// No "server-only" import: drizzle-kit loads this file outside Next. It holds table shapes only;
// the connection lives in ./client.ts, which is server-only.
export const studio = pgSchema("studio");
