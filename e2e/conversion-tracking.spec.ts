import { expect, test } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

// Spec 0020. The e2e server runs with intake disabled, so the submit chain is covered by
// ContactForm.test.tsx and workflow.db.test.ts; this covers the real click handoff and the studio row.

test("AC-1, AC-10: a call to action remembers its location and /contact keeps a clean URL", async ({ page }) => {
  await page.goto("/");
  await page.locator("#pitch").getByRole("link", { name: "Tell me about your project" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  const stored = await page.evaluate(() => sessionStorage.getItem("ed:contact-location"));
  expect(JSON.parse(stored!)).toMatchObject({ location: "hero" });
});

test("AC-9: the studio inquiry page shows the stored source", async ({ page, context }) => {
  test.setTimeout(120_000);
  if (!process.env.DATABASE_URL) throw new Error("Development database required for isolated browser fixture");
  const q = neon(process.env.DATABASE_URL);
  const workspace = randomUUID(),
    owner = randomUUID(),
    token = randomBytes(32).toString("base64url");
  const fixtures = [
    { id: randomUUID(), source: "hero", label: "Hero call to action" },
    { id: randomUUID(), source: null, label: "Not recorded" },
    { id: randomUUID(), source: "retired_spot", label: "retired_spot" },
  ];
  try {
    await q`insert into studio.workspaces(id,name,slug) values(${workspace}::uuid,'FAKE browser source',${`fake-source-${workspace}`})`;
    await q`insert into studio.owners(id,display_name) values(${owner}::uuid,'FAKE source owner')`;
    await q`insert into studio.workspace_members(workspace_id,owner_id,role) values(${workspace}::uuid,${owner}::uuid,'owner')`;
    await q`insert into studio.sessions(token_hash,owner_id,workspace_id,expires_at) values(${createHash("sha256").update(token).digest("hex")},${owner}::uuid,${workspace}::uuid,now()+interval '1 hour')`;
    for (const f of fixtures) {
      await q`insert into studio.inquiries(id,workspace_id,submission_key,payload_hash,name,email,description,privacy_notice_version,source_location) values(${f.id}::uuid,${workspace}::uuid,${randomUUID()}::uuid,'fake-hash','Fake Source Visitor','fake-source@example.invalid','This is a fake project used only for local source checks.','lead-intake-v1',${f.source})`;
      await q`insert into studio.inquiry_alerts(inquiry_id) values(${f.id}::uuid)`;
    }
    await context.addCookies([{ name: "studio_session", value: token, url: "http://localhost:3100", httpOnly: true, sameSite: "Lax" }]);
    for (const f of fixtures) {
      await page.goto(`/studio/inquiries/${f.id}`);
      // Scoped to main: while the page streams in, a hidden copy can sit outside it.
      const row = page.getByRole("main").locator("dl > div").filter({ has: page.locator("dt", { hasText: /^Source$/ }) });
      await expect(row.locator("dd")).toHaveText(f.label);
    }
  } finally {
    await q`delete from studio.inquiries where workspace_id=${workspace}::uuid`;
    await q`delete from studio.workspace_members where workspace_id=${workspace}::uuid`;
    await q`delete from studio.workspaces where id=${workspace}::uuid`;
    await q`delete from studio.owners where id=${owner}::uuid`;
  }
});
