import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Browser fixtures run locally on the development branch only");
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const result = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], { stdio: "inherit", env: process.env });
process.exitCode = result.status ?? 1;
