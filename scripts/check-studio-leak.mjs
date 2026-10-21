// Tripwire after `next build` (spec 0003, AC-5): fails the build if studio server code or a studio
// secret shows up in public output. It only sees build output; dynamic studio responses are covered
// by requireStudioAccess() and `server-only`, not by this script.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";

// Load env files the way `next build` does (production mode), so we scan for exactly what the build could see.
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const STUDIO_SERVER_MARKER = "__ed_studio_server_only__";
const MIN_SECRET_LENGTH = 16;
const onVercel = process.env.VERCEL === "1";

const NEXT_DIR = path.join(process.cwd(), ".next");
const STATIC_DIR = path.join(NEXT_DIR, "static");
const SERVER_APP_DIR = path.join(NEXT_DIR, "server", "app");

function passwordOf(connectionString) {
  try {
    return decodeURIComponent(new URL(connectionString).password);
  } catch {
    return "";
  }
}

// [label, value] for each studio secret; the value is the password or token part only.
const secretSources = [
  ["DATABASE_URL password", passwordOf(process.env.DATABASE_URL ?? "")],
  ["DATABASE_URL_UNPOOLED password", passwordOf(process.env.DATABASE_URL_UNPOOLED ?? "")],
  ["BLOB_READ_WRITE_TOKEN", process.env.BLOB_READ_WRITE_TOKEN ?? ""],
];

// Set only for minutes at a time (spec 0005), so it is scanned when present and never required.
const optionalSecretSources = [["STUDIO_SETUP_TOKEN", process.env.STUDIO_SETUP_TOKEN ?? ""]];
const intakeSecrets = ["TURNSTILE_SECRET_KEY", "RESEND_API_KEY", "INQUIRY_ALERT_FROM", "INQUIRY_ALERT_TO", "INQUIRY_RATE_SECRET", "CRON_SECRET", "LEAD_INTAKE_WORKSPACE_ID"];
for (const key of intakeSecrets) optionalSecretSources.push([key, process.env[key] ?? ""]);
if (process.env.VERCEL_ENV === "production" && process.env.LEAD_INTAKE_ENABLED === "true") {
  const required = [...intakeSecrets, "LEAD_INTAKE_ORIGIN", "TURNSTILE_SITE_KEY"];
  if (required.some(key => !process.env[key])) throw new Error("Enabled production intake requires all intake configuration");
  if (Buffer.byteLength(process.env.INQUIRY_RATE_SECRET) < 32 || Buffer.byteLength(process.env.CRON_SECRET) < 32) throw new Error("Invalid production intake configuration");
}

// Spec 0005, AC-13: a production studio cannot sign anyone in without a valid passkey domain and origin.
function checkLoginConfig() {
  if (process.env.VERCEL_ENV !== "production" || process.env.STUDIO_ENABLED !== "true") {
    return;
  }
  const rpID = process.env.STUDIO_RP_ID ?? "";
  const origin = process.env.STUDIO_ORIGIN ?? "";
  if (!rpID || !origin) {
    throw new Error("STUDIO_RP_ID and STUDIO_ORIGIN must be set in Production while STUDIO_ENABLED is true");
  }
  let host;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") {
      throw new Error("not https");
    }
    host = url.hostname;
  } catch {
    throw new Error("STUDIO_ORIGIN must be an https:// origin in Production");
  }
  if (host !== rpID && !host.endsWith(`.${rpID}`)) {
    throw new Error("STUDIO_ORIGIN's host must equal STUDIO_RP_ID or be a subdomain of it");
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name));
}

// Public route output: prerendered .html and .rsc under .next/server/app, everything outside `studio`.
function isPublicRouteOutput(file) {
  const relative = path.relative(SERVER_APP_DIR, file).split(path.sep);
  if (relative[0] === "(studio)" || relative[0] === "studio" || relative[0].startsWith("studio.")) {
    return false;
  }
  return file.endsWith(".html") || file.endsWith(".rsc");
}

async function main() {
  checkLoginConfig();
  const needles = [["studio server marker", STUDIO_SERVER_MARKER]];
  for (const [label, value] of optionalSecretSources) {
    if (value.length >= MIN_SECRET_LENGTH || (intakeSecrets.includes(label) && value.length > 0)) {
      needles.push([label, value]);
    }
  }
  const skipped = [];
  for (const [label, value] of secretSources) {
    if (value.length >= MIN_SECRET_LENGTH) {
      needles.push([label, value]);
    } else {
      skipped.push(label);
    }
  }

  if (skipped.length > 0) {
    if (onVercel) {
      throw new Error(`studio secrets missing at build time, cannot scan for them: ${skipped.join(", ")}`);
    }
    console.log(`[leak-check] skipped (not set or shorter than ${MIN_SECRET_LENGTH} chars locally): ${skipped.join(", ")}`);
  }

  const files = [...(await walk(STATIC_DIR)), ...(await walk(SERVER_APP_DIR)).filter(isPublicRouteOutput)];
  if (files.length === 0) {
    throw new Error("no build output found under .next, run `next build` first");
  }

  const hits = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const [label, value] of needles) {
      if (content.includes(value)) {
        // Never print the secret itself, only what matched and where.
        hits.push(`${label} in ${path.relative(process.cwd(), file)}`);
      }
    }
  }

  if (hits.length > 0) {
    throw new Error(`studio leak in public build output:\n  ${hits.join("\n  ")}`);
  }
  console.log(`[leak-check] clean: ${files.length} files scanned for ${needles.length} studio strings`);
}

main().catch((error) => {
  console.error(`[leak-check] failed: ${error.message}`);
  process.exit(1);
});
