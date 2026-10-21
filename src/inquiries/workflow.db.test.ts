import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
import { getDb, rows } from "./db";
import { closeDb } from "@/studio/db/client";
import { runInWorkspace } from "@/studio/data/workspace";
import {
  convertInquiry,
  getInquiry,
  changeInquiryStatus,
} from "@/studio/data/inquiries";
import { ingest } from "./ingest";
import { attemptAlert } from "./alerts";
import { cleanupInquiries } from "./cleanup";
import type { IntakeConfig } from "./config";

const workspace = randomUUID(),
  owner = randomUUID();
const config: IntakeConfig = {
  workspaceId: workspace,
  origin: "http://localhost:3000",
  turnstileSecret: "fake",
  resendKey: "fake",
  sender: "fake@example.invalid",
  recipient: "fake-owner@example.invalid",
  rateSecret: "fake".repeat(16),
  production: false,
};
const challenge = (async () =>
  Response.json({
    success: true,
    action: "lead_intake",
    hostname: "localhost",
  })) as typeof fetch;
let counter = 0;
async function submit(
  key = randomUUID(),
  email = `fake${counter++}@example.invalid`,
  description = "This is a fake project for isolated integration verification.",
) {
  return ingest(
    new Request(config.origin + "/api/inquiries", {
      method: "POST",
      headers: { origin: config.origin, "content-type": "application/json" },
      body: JSON.stringify({
        submissionKey: key,
        name: "Fake Visitor",
        email,
        description,
        company: "Fake Company",
        budget: "Fake budget",
        acknowledged: true,
        noticeVersion: "lead-intake-v1",
        challengeToken: "fake",
      }),
    }),
    { config, address: `192.0.2.${counter++}`, fetcher: challenge },
  );
}
beforeAll(async () => {
  if (process.env.VERCEL || process.env.VERCEL_ENV)
    throw new Error("Development tests cannot run on Vercel");
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL_UNPOOLED)
    throw new Error("Development database configuration required");
  await getDb().execute(
    sql`insert into studio.workspaces(id,name,slug) values(${workspace}::uuid,'FAKE inquiry integration',${`fake-inquiry-${workspace}`})`,
  );
  await getDb().execute(
    sql`insert into studio.owners(id,display_name) values(${owner}::uuid,'FAKE inquiry owner')`,
  );
  await getDb().execute(
    sql`insert into studio.workspace_members(workspace_id,owner_id,role) values(${workspace}::uuid,${owner}::uuid,'owner')`,
  );
});
afterAll(async () => {
  await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`delete from studio.inquiries where workspace_id=${workspace}::uuid`,
    );
    await tx.execute(
      sql`delete from studio.inquiry_rate_windows where workspace_id=${workspace}::uuid`,
    );
    await tx.execute(
      sql`delete from studio.inquiry_maintenance where workspace_id=${workspace}::uuid`,
    );
    await tx.execute(
      sql`delete from studio.notes where workspace_id=${workspace}::uuid`,
    );
    await tx.execute(
      sql`delete from studio.contacts where workspace_id=${workspace}::uuid`,
    );
    await tx.execute(
      sql`delete from studio.clients where workspace_id=${workspace}::uuid`,
    );
    await tx.execute(
      sql`delete from studio.workspace_members where workspace_id=${workspace}::uuid`,
    );
    await tx.execute(
      sql`delete from studio.workspaces where id=${workspace}::uuid`,
    );
    await tx.execute(sql`delete from studio.owners where id=${owner}::uuid`);
  });
  await closeDb();
});
describe("AC-3 through AC-10: isolated development transactions", () => {
  it("deduplicates concurrent submissions and rejects changed payloads", async () => {
    const key = randomUUID();
    const address = "same@example.invalid";
    const [a, b] = await Promise.all([
      submit(key, address),
      submit(key, address),
    ]);
    expect([a.id, b.id].filter(Boolean)).toHaveLength(1);
    const saved = await rows(
      getDb(),
      sql`select id from studio.inquiries where workspace_id=${workspace}::uuid and submission_key=${key}::uuid`,
    );
    expect(saved).toHaveLength(1);
    await expect(
      submit(
        key,
        address,
        "A changed description must be rejected without saving.",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("rolls back a competing conversion and returns the same result after later client archive", async () => {
    const { id } = await submit();
    await runInWorkspace(workspace, async () => {
      const { inquiry } = await getInquiry(id!);
      const input = {
        id: id!,
        version: inquiry.updated_at,
        conversionKey: randomUUID(),
        mode: "new",
        clientId: "",
        clientName: `Fake race ${randomUUID()}`,
        contactName: "Fake Contact",
        contactEmail: "fake-convert@example.invalid",
      };
      const [a, b] = await Promise.all([
        convertInquiry(input, owner),
        convertInquiry(input, owner),
      ]);
      expect(a).toBe(b);
      expect(
        await rows(
          getDb(),
          sql`select id from studio.contacts where workspace_id=${workspace}::uuid and client_id=${a}::uuid`,
        ),
      ).toHaveLength(1);
      expect(
        await rows(
          getDb(),
          sql`select id from studio.notes where workspace_id=${workspace}::uuid and client_id=${a}::uuid`,
        ),
      ).toHaveLength(1);
      await getDb().execute(
        sql`update studio.clients set archived_at=now() where id=${a}::uuid and workspace_id=${workspace}::uuid`,
      );
      expect(await convertInquiry(input, owner)).toBe(a);
      await expect(
        convertInquiry({ ...input, conversionKey: randomUUID() }, owner),
      ).rejects.toMatchObject({ code: "ALREADY_CONVERTED" });
    });
  });
  it("checks versions and prevents cross workspace reads without extending activity on reads", async () => {
    const { id } = await submit();
    await runInWorkspace(workspace, async () => {
      const before = await getInquiry(id!);
      const after = await getInquiry(id!);
      expect(after.inquiry.last_activity_at).toBe(
        before.inquiry.last_activity_at,
      );
      await changeInquiryStatus(
        id!,
        before.inquiry.updated_at,
        "closed",
        owner,
      );
      await expect(
        changeInquiryStatus(id!, before.inquiry.updated_at, "reviewing", owner),
      ).rejects.toMatchObject({ code: "STALE_RECORD" });
      const closed = await getInquiry(id!);
      await changeInquiryStatus(
        id!,
        closed.inquiry.updated_at,
        "reviewing",
        owner,
      );
    });
    await runInWorkspace(randomUUID(), async () => {
      await expect(getInquiry(id!)).rejects.toMatchObject({ status: 404 });
    });
  });
  it("freezes failed alert retry payload and excludes all visitor fields", async () => {
    const { id } = await submit();
    const bodies: string[] = [],
      keys: string[] = [];
    const provider = (async (_url, options) => {
      bodies.push(String(options?.body));
      keys.push(new Headers(options?.headers).get("idempotency-key")!);
      return Response.json({ error: "fake" }, { status: 400 });
    }) as typeof fetch;
    await attemptAlert(id!, workspace, config, undefined, provider);
    await getDb().execute(
      sql`update studio.inquiry_alerts set last_attempted_at=now()-interval '2 minutes' where inquiry_id=${id}::uuid`,
    );
    const result = await runInWorkspace(workspace, () => getInquiry(id!));
    await attemptAlert(
      id!,
      workspace,
      { ...config, sender: "changed@example.invalid" },
      {
        version: result.alert.updated_at,
        generation: result.alert.generation,
        confirmDuplicate: false,
        actor: owner,
      },
      provider,
    );
    expect(bodies[0]).toBe(bodies[1]);
    expect(keys[0]).toBe(keys[1]);
    expect(bodies[0]).not.toContain("Fake Visitor");
    expect(bodies[0]).not.toContain("Fake budget");
  });
  it("deletes expired converted source and its alerts while retaining copied client records", async () => {
    const { id } = await submit();
    let clientId = "";
    await runInWorkspace(workspace, async () => {
      const { inquiry } = await getInquiry(id!);
      clientId = await convertInquiry(
        {
          id: id!,
          version: inquiry.updated_at,
          conversionKey: randomUUID(),
          mode: "new",
          clientId: "",
          clientName: `Fake retention ${randomUUID()}`,
          contactName: "Fake Retained",
          contactEmail: "fake-retained@example.invalid",
        },
        owner,
      );
    });
    await getDb().execute(
      sql`update studio.inquiries set converted_at=now()-interval '13 months' where id=${id}::uuid and workspace_id=${workspace}::uuid`,
    );
    const result = await cleanupInquiries(workspace);
    expect(result.outcome).toBe("complete");
    expect(
      await rows(
        getDb(),
        sql`select id from studio.inquiries where id=${id}::uuid`,
      ),
    ).toHaveLength(0);
    expect(
      await rows(
        getDb(),
        sql`select id from studio.contacts where client_id=${clientId}::uuid and workspace_id=${workspace}::uuid`,
      ),
    ).toHaveLength(1);
    expect(
      await rows(
        getDb(),
        sql`select id from studio.notes where client_id=${clientId}::uuid and workspace_id=${workspace}::uuid`,
      ),
    ).toHaveLength(1);
  });
  it("enforces email quotas without charging successful replays again", async () => {
    const address = `quota-${randomUUID()}@example.invalid`;
    const key = randomUUID();
    await submit(key, address);
    await submit(key, address);
    await submit(randomUUID(), address);
    await submit(randomUUID(), address);
    await expect(submit(randomUUID(), address)).rejects.toMatchObject({
      status: 429,
    });
  });
  it("reuses an existing contact and lets the copied note be deleted normally", async () => {
    const clientName = `Fake existing ${randomUUID()}`;
    const [client] = await rows<{ id: string }>(
      getDb(),
      sql`insert into studio.clients(workspace_id,name,status) values(${workspace}::uuid,${clientName},'active') returning id`,
    );
    const [contact] = await rows<{ id: string }>(
      getDb(),
      sql`insert into studio.contacts(workspace_id,client_id,full_name,email,is_primary) values(${workspace}::uuid,${client.id}::uuid,'Existing fake contact','existing@example.invalid',true) returning id`,
    );
    const { id } = await submit();
    await runInWorkspace(workspace, async () => {
      const { inquiry } = await getInquiry(id!);
      await convertInquiry(
        {
          id: id!,
          version: inquiry.updated_at,
          conversionKey: randomUUID(),
          mode: "existing",
          clientId: client.id,
          clientName: "",
          contactName: "Do not overwrite",
          contactEmail: "EXISTING@example.invalid",
        },
        owner,
      );
      const converted = await getInquiry(id!);
      expect(converted.inquiry.converted_contact_id).toBe(contact.id);
      await getDb().execute(
        sql`delete from studio.notes where workspace_id=${workspace}::uuid and id=${converted.inquiry.converted_note_id}::uuid`,
      );
      expect((await getInquiry(id!)).inquiry.converted_note_id).toBeNull();
      const [retained] = await rows<{ full_name: string }>(
        getDb(),
        sql`select full_name from studio.contacts where id=${contact.id}::uuid`,
      );
      expect(retained.full_name).toBe("Existing fake contact");
    });
  });
  it("rolls back conversion when a live name conflicts or target client is archived", async () => {
    const name = `Fake conflict ${randomUUID()}`;
    const [client] = await rows<{ id: string }>(
      getDb(),
      sql`insert into studio.clients(workspace_id,name,status) values(${workspace}::uuid,${name},'lead') returning id`,
    );
    const { id } = await submit();
    await runInWorkspace(workspace, async () => {
      const { inquiry } = await getInquiry(id!);
      const input = {
        id: id!,
        version: inquiry.updated_at,
        conversionKey: randomUUID(),
        mode: "new",
        clientId: "",
        clientName: name,
        contactName: "Fake Contact",
        contactEmail: "fake-conflict@example.invalid",
      };
      await expect(convertInquiry(input, owner)).rejects.toMatchObject({
        code: "DUPLICATE_CLIENT_NAME",
      });
      await getDb().execute(
        sql`update studio.clients set archived_at=now() where id=${client.id}::uuid and workspace_id=${workspace}::uuid`,
      );
      await expect(
        convertInquiry(
          { ...input, mode: "existing", clientId: client.id },
          owner,
        ),
      ).rejects.toMatchObject({ code: "CLIENT_ARCHIVED" });
      expect((await getInquiry(id!)).inquiry.status).toBe("new");
      expect(
        await rows(
          getDb(),
          sql`select id from studio.contacts where client_id=${client.id}::uuid`,
        ),
      ).toHaveLength(0);
    });
  });
  it("requires confirmation for uncertain alerts after the safe window and blocks a live lease", async () => {
    const { id } = await submit();
    await attemptAlert(id!, workspace, config, undefined, (async () => {
      throw new Error("fake timeout");
    }) as typeof fetch);
    await getDb().execute(
      sql`update studio.inquiry_alerts set first_attempted_at=now()-interval '24 hours',last_attempted_at=now()-interval '2 minutes' where inquiry_id=${id}::uuid`,
    );
    const { alert } = await runInWorkspace(workspace, () => getInquiry(id!));
    const retry = {
      version: alert.updated_at,
      generation: alert.generation,
      confirmDuplicate: false,
      actor: owner,
    };
    await expect(
      attemptAlert(id!, workspace, config, retry),
    ).rejects.toMatchObject({ code: "CONFIRM_DUPLICATE_RISK" });
    await attemptAlert(
      id!,
      workspace,
      config,
      { ...retry, confirmDuplicate: true },
      (async () => Response.json({ id: "fake-accepted" })) as typeof fetch,
    );
    expect(
      (await runInWorkspace(workspace, () => getInquiry(id!))).alert.generation,
    ).toBe(2);
    const live = await submit();
    await getDb().execute(
      sql`update studio.inquiry_alerts set state='sending',lease_id=${randomUUID()}::uuid,lease_expires_at=now()+interval '30 seconds' where inquiry_id=${live.id}::uuid`,
    );
    const liveAlert = (
      await runInWorkspace(workspace, () => getInquiry(live.id!))
    ).alert;
    await expect(
      attemptAlert(live.id!, workspace, config, {
        ...retry,
        version: liveAlert.updated_at,
      }),
    ).rejects.toMatchObject({ code: "SENDING" });
  });
  it("reports incomplete cleanup for a live lease, then expires it without losing a racing conversion", async () => {
    const { id } = await submit();
    await getDb().execute(
      sql`update studio.inquiries set last_activity_at=now()-interval '13 months' where id=${id}::uuid`,
    );
    await getDb().execute(
      sql`update studio.inquiry_alerts set state='sending',lease_id=${randomUUID()}::uuid,lease_expires_at=now()+interval '30 seconds' where inquiry_id=${id}::uuid`,
    );
    expect((await cleanupInquiries(workspace)).outcome).toBe("incomplete");
    await getDb().execute(
      sql`update studio.inquiry_alerts set lease_expires_at=now()-interval '1 minute' where inquiry_id=${id}::uuid`,
    );
    await runInWorkspace(workspace, async () => {
      const { inquiry } = await getInquiry(id!);
      const outcomes = await Promise.allSettled([
        cleanupInquiries(workspace),
        convertInquiry(
          {
            id: id!,
            version: inquiry.updated_at,
            conversionKey: randomUUID(),
            mode: "new",
            clientId: "",
            clientName: `Fake cleanup race ${randomUUID()}`,
            contactName: "Fake Race",
            contactEmail: "fake-race@example.invalid",
          },
          owner,
        ),
      ]);
      const current = await rows<{
        status: string;
        converted_client_id: string | null;
      }>(
        getDb(),
        sql`select status,converted_client_id from studio.inquiries where id=${id}::uuid`,
      );
      if (current.length) {
        expect(current[0].status).toBe("converted");
        expect(outcomes[1].status).toBe("fulfilled");
      } else {
        expect(outcomes[1].status).toBe("rejected");
      }
    });
  });
});
