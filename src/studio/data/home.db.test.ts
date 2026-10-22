import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { loadEnvConfig } from "@next/env";
import { getDb } from "@/inquiries/db";
import { closeDb } from "@/studio/db/client";
import { runInWorkspace } from "@/studio/data/workspace";
import { getRetentionAttention } from "@/studio/retention/service";
import { productLinks, products } from "@/studio/systems/bundled";
import { diffPublic } from "@/studio/systems/drift";
import { getContractSignal, getExportDriftSignal, getInquirySignal, getStatusOverview } from "./home";

// Fake rows in a throwaway workspace (spec 0012, Critical test scenarios). Contracts get no status events: those
// rows are append only and would pin the workspace, so the contract rows exercise the created_at fallback.
const workspace = randomUUID();
const other = randomUUID();
const scoped = <T,>(fn: () => Promise<T>) => runInWorkspace(workspace, fn);
const exec = (query: ReturnType<typeof sql>) => getDb().execute(query);

async function inquiry(ws: string, name: string, status: string, hoursAgo: number, alert?: { state: string; leaseMinutes?: number }) {
  const id = randomUUID();
  await exec(sql`insert into studio.inquiries(id,workspace_id,submission_key,payload_hash,name,email,description,company,privacy_notice_version,status,created_at)
    values(${id}::uuid,${ws}::uuid,${randomUUID()}::uuid,'fake-hash',${name},'fake@example.invalid','FAKE description long enough to pass',${name === "FAKE oldest" ? "FAKE Co" : null},'fake-v1',${status},now()-make_interval(hours=>${hoursAgo}))`);
  if (alert) {
    await exec(sql`insert into studio.inquiry_alerts(inquiry_id,state,lease_expires_at) values(${id}::uuid,${alert.state},${
      alert.leaseMinutes === undefined ? null : sql`now()+make_interval(mins=>${alert.leaseMinutes})`
    })`);
  }
  return id;
}

async function client(ws: string, name: string, status = "lead", archived = false) {
  const id = randomUUID();
  await exec(sql`insert into studio.clients(id,workspace_id,name,status,archived_at) values(${id}::uuid,${ws}::uuid,${name},${status},${archived ? sql`now()-interval '13 months'` : null})`);
  return id;
}

async function contract(ws: string, clientId: string, title: string, status: string, hoursAgo: number, archived = false) {
  const id = randomUUID();
  await exec(sql`insert into studio.contracts(id,workspace_id,client_id,title,status,created_at,archived_at) values(${id}::uuid,${ws}::uuid,${clientId}::uuid,${title},${status},now()-make_interval(hours=>${hoursAgo}),${archived ? sql`now()` : null})`);
  return id;
}

const ids: Record<string, string> = {};

beforeAll(async () => {
  if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Development only");
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  for (const ws of [workspace, other]) {
    await exec(sql`insert into studio.workspaces(id,name,slug) values(${ws}::uuid,'FAKE home tests',${"fake-home-" + ws})`);
  }

  ids.oldest = await inquiry(workspace, "FAKE oldest", "new", 50, { state: "failed" });
  ids.middle = await inquiry(workspace, "FAKE middle", "reviewing", 20, { state: "sending", leaseMinutes: -5 });
  ids.third = await inquiry(workspace, "FAKE third", "new", 10, { state: "sending", leaseMinutes: 5 });
  ids.fourth = await inquiry(workspace, "FAKE fourth", "new", 1, { state: "accepted" });
  await inquiry(workspace, "FAKE closed", "closed", 100, { state: "unknown" });
  await inquiry(other, "FAKE other workspace", "new", 200, { state: "failed" });

  const live = await client(workspace, "FAKE live client", "active");
  await client(workspace, "FAKE lead");
  ids.eligible = await client(workspace, "FAKE eligible", "past", true);
  ids.blocked = await client(workspace, "FAKE blocked", "past", true);
  const otherClient = await client(other, "FAKE other client");

  ids.sentOld = await contract(workspace, live, "FAKE sent old", "sent", 72);
  ids.sentNew = await contract(workspace, live, "FAKE sent new", "sent", 2);
  ids.draft = await contract(workspace, live, "FAKE draft", "draft", 100);
  await contract(workspace, live, "FAKE archived sent", "sent", 300, true);
  await contract(workspace, ids.blocked, "FAKE blocks retention", "ended", 400);
  await contract(other, otherClient, "FAKE other sent", "sent", 500);

  await exec(sql`insert into studio.projects(workspace_id,client_id,name,status) values(${workspace}::uuid,${live}::uuid,'FAKE project','active'),(${workspace}::uuid,${live}::uuid,'FAKE archived project','done')`);
  await exec(sql`update studio.projects set archived_at=now() where workspace_id=${workspace}::uuid and name='FAKE archived project'`);
});

afterAll(async () => {
  for (const ws of [workspace, other]) {
    await exec(sql`delete from studio.inquiry_alerts where inquiry_id in (select id from studio.inquiries where workspace_id=${ws}::uuid)`);
    for (const table of ["inquiries", "projects", "contracts", "contacts", "clients"]) {
      await exec(sql`delete from ${sql.identifier("studio")}.${sql.identifier(table)} where workspace_id=${ws}::uuid`);
    }
    await exec(sql`delete from studio.workspaces where id=${ws}::uuid`);
  }
  await closeDb();
});

describe("home dashboard signals on isolated fake records", () => {
  // covers: AC-3.
  it("counts open inquiries and alert problems, oldest open first, in this workspace only", () =>
    scoped(async () => {
      const signal = await getInquirySignal();
      expect(signal.open).toBe(4);
      // failed, expired sending, and the closed unknown one; a live sending lease is not a problem.
      expect(signal.alertProblems).toBe(3);
      expect(signal.rows.map((row) => row.id)).toEqual([ids.oldest, ids.middle, ids.third]);
      expect(signal.rows.map((row) => row.alertProblem)).toEqual([true, true, false]);
      expect(signal.rows[0].company).toBe("FAKE Co");
      expect(signal.rows[1].company).toBeNull();
      expect(Object.keys(signal.rows[0]).sort()).toEqual(["alertProblem", "company", "createdAt", "id", "name"]);
    }));

  // covers: AC-4.
  it("counts live sent and draft contracts and lists sent first, oldest first", () =>
    scoped(async () => {
      const signal = await getContractSignal();
      expect(signal).toMatchObject({ sent: 2, draft: 1 });
      expect(signal.rows.map((row) => row.id)).toEqual([ids.sentOld, ids.sentNew, ids.draft]);
      expect(signal.rows[0]).toMatchObject({ title: "FAKE sent old", clientName: "FAKE live client", status: "sent" });
    }));

  // covers: AC-5.
  it("lists only eligible retention records, matching the retention list's classification", () =>
    scoped(async () => {
      const signal = await getRetentionAttention(3);
      expect(signal.eligible).toBe(1);
      expect(signal.rows).toEqual([{ kind: "client", id: ids.eligible, name: "FAKE eligible", dueAt: expect.any(String) }]);
    }));

  // covers: AC-6.
  it("compares the public projection with the bundled file", () =>
    scoped(async () => {
      const signal = await getExportDriftSignal();
      expect(signal.differences).toEqual(diffPublic({ systems: [], links: [] }, { products, productLinks }));
    }));

  // covers: AC-8.
  it("tallies non archived rows per status with zeros filled in", () =>
    scoped(async () => {
      const overview = await getStatusOverview();
      expect(overview.clients).toEqual({ lead: 1, active: 1, past: 0 });
      expect(overview.contracts).toEqual({ draft: 1, sent: 2, signed: 0, active: 0, ended: 1, cancelled: 0 });
      expect(overview.projects).toEqual({ planned: 0, active: 1, on_hold: 0, done: 0, cancelled: 0 });
    }));
});
