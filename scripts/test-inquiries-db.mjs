import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
if (process.env.VERCEL || process.env.VERCEL_ENV)
  throw new Error("Database tests run locally on the development branch only");
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL_UNPOOLED)
  throw new Error("Development database configuration required");
const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "vitest.integration.config.mts",
  ],
  { stdio: "inherit", env: process.env },
);
process.exitCode = result.status ?? 1;
