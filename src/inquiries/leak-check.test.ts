import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = path.resolve("scripts/check-studio-leak.mjs");
const publicEmail = "erskine.duenas@gmail.com";

function scan(content: string, values: Record<string, string>) {
  const cwd = mkdtempSync(path.join(tmpdir(), "intake-leak-"));
  try {
    mkdirSync(path.join(cwd, ".next/static"), { recursive: true });
    writeFileSync(path.join(cwd, ".next/static/fixture.js"), content);
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (/^(VERCEL|STUDIO_|LEAD_INTAKE_|INQUIRY_|TURNSTILE_|RESEND_|DATABASE_URL|BLOB_READ_WRITE_TOKEN|CRON_SECRET|__NEXT_PROCESSED_ENV)/.test(key)) delete env[key];
    }
    return spawnSync(process.execPath, [script], {
      cwd,
      env: { ...env, ...values },
      encoding: "utf8",
      timeout: 15000,
    });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

describe("public build leak check", () => {
  it("allows a recipient that is already the public contact email", () => {
    const result = scan(publicEmail, { INQUIRY_ALERT_TO: publicEmail });
    expect(result.status, result.stderr).toBe(0);
  });

  it("rejects a private recipient in public output without printing it", () => {
    const recipient = "private-owner@example.test";
    const result = scan(recipient, { INQUIRY_ALERT_TO: recipient });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("INQUIRY_ALERT_TO in");
    expect(result.stderr).not.toContain(recipient);
  });

  it("still scans credentials even when their value matches public content", () => {
    const result = scan(publicEmail, {
      INQUIRY_ALERT_TO: publicEmail,
      RESEND_API_KEY: publicEmail,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("RESEND_API_KEY in");
  });

  it("still rejects the server marker", () => {
    const result = scan("__ed_studio_server_only__", {});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("studio server marker in");
  });
});
