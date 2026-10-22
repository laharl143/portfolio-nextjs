import { expect, test } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
test("AC-1, AC-10, AC-11: disabled form offers email and signed out inbox stays private", async ({
  page,
  request,
}) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tell me about your project",
  );
  await expect(
    page.getByText("The inquiry form is currently unavailable."),
  ).toBeVisible();
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://ed-solutions.dev/contact",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/studio/inquiries");
  await expect(page).toHaveURL(/\/studio\/login/);
  const response = await request.post("/api/inquiries", {
    data: { name: "FAKE_PRIVATE_SENTINEL" },
  });
  expect(response.status()).toBe(503);
  expect(await response.text()).not.toContain("FAKE_PRIVATE_SENTINEL");
  expect((await request.get("/api/internal/inquiries/cleanup")).status()).toBe(
    401,
  );
});

test('AC-5 through AC-7: fake owner reviews and converts an inquiry in the real studio',async({page,context},testInfo)=>{
  // Each studio route compiles cold on first visit in dev, several seconds apiece.
  test.setTimeout(150_000);
  if(!process.env.DATABASE_URL)throw new Error('Development database required for isolated browser fixture');
  const q=neon(process.env.DATABASE_URL);
  const workspace=randomUUID(),owner=randomUUID(),id=randomUUID(),token=randomBytes(32).toString('base64url');
  try{
    await q`insert into studio.workspaces(id,name,slug) values(${workspace}::uuid,'FAKE browser inquiry',${`fake-browser-${workspace}`})`;
    await q`insert into studio.owners(id,display_name) values(${owner}::uuid,'FAKE browser owner')`;
    await q`insert into studio.workspace_members(workspace_id,owner_id,role) values(${workspace}::uuid,${owner}::uuid,'owner')`;
    await q`insert into studio.sessions(token_hash,owner_id,workspace_id,expires_at) values(${createHash('sha256').update(token).digest('hex')},${owner}::uuid,${workspace}::uuid,now()+interval '1 hour')`;
    await q`insert into studio.inquiries(id,workspace_id,submission_key,payload_hash,name,email,description,company,privacy_notice_version) values(${id}::uuid,${workspace}::uuid,${randomUUID()}::uuid,'fake-hash','Fake Browser Visitor','fake-browser@example.invalid','This is a fake browser project used only for local checks.','Fake Browser Company','lead-intake-v1')`;
    await q`insert into studio.inquiry_alerts(inquiry_id) values(${id}::uuid)`;
    await q`insert into studio.inquiry_events(workspace_id,inquiry_id,kind) values(${workspace}::uuid,${id}::uuid,'submitted')`;
    await context.addCookies([{name:'studio_session',value:token,url:'http://localhost:3100',httpOnly:true,sameSite:'Lax'}]);
    await page.goto('/studio/inquiries');
    await expect(page.getByRole('link',{name:'Fake Browser Visitor'})).toBeVisible();
    await page.getByRole('link',{name:'Fake Browser Visitor'}).click();
    await expect(page.getByRole('heading',{name:'Fake Browser Visitor'})).toBeVisible({timeout:30_000});
    await page.getByRole('button',{name:'Mark reviewing',exact:true}).click();
    await expect(page.getByRole('button',{name:'Mark reviewing',exact:true})).toHaveCount(0);
    await page.getByRole('link',{name:'Review conversion'}).click();
    await expect(page.getByRole('heading',{name:'Confirm conversion'})).toBeVisible({timeout:30_000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath('fake-conversion-light.png'),fullPage:true});
    await page.evaluate(()=>document.documentElement.classList.add('dark'));
    await page.screenshot({path:testInfo.outputPath('fake-conversion-dark.png'),fullPage:true});
    await page.getByRole('checkbox').check();
    await page.getByRole('button',{name:'Confirm conversion',exact:true}).click();
    await expect(page).toHaveURL(/\/studio\/clients\/[0-9a-f-]+$/,{timeout:60_000});
    const result=await q`select status from studio.inquiries where id=${id}::uuid and workspace_id=${workspace}::uuid`;
    expect(result[0].status).toBe('converted');
  }finally{
    await q`delete from studio.inquiries where workspace_id=${workspace}::uuid`;
    await q`delete from studio.notes where workspace_id=${workspace}::uuid`;
    await q`delete from studio.contacts where workspace_id=${workspace}::uuid`;
    await q`delete from studio.clients where workspace_id=${workspace}::uuid`;
    await q`delete from studio.workspace_members where workspace_id=${workspace}::uuid`;
    await q`delete from studio.workspaces where id=${workspace}::uuid`;
    await q`delete from studio.owners where id=${owner}::uuid`;
  }
});

test('AC-10: owner inbox search keeps visitor names and emails out of request URLs',async({page,context})=>{
  if(!process.env.DATABASE_URL)throw new Error('Development database required for isolated browser fixture');
  const q=neon(process.env.DATABASE_URL);
  const workspace=randomUUID(),owner=randomUUID(),token=randomBytes(32).toString('base64url');
  try{
    await q`insert into studio.workspaces(id,name,slug) values(${workspace}::uuid,'FAKE browser search',${`fake-search-${workspace}`})`;
    await q`insert into studio.owners(id,display_name) values(${owner}::uuid,'FAKE search owner')`;
    await q`insert into studio.workspace_members(workspace_id,owner_id,role) values(${workspace}::uuid,${owner}::uuid,'owner')`;
    await q`insert into studio.sessions(token_hash,owner_id,workspace_id,expires_at) values(${createHash('sha256').update(token).digest('hex')},${owner}::uuid,${workspace}::uuid,now()+interval '1 hour')`;
    for(const [name,email] of [['Fake Browser Visitor','fake-browser@example.invalid'],['Fake Other Visitor','fake-other@example.invalid']])
      await q`insert into studio.inquiries(workspace_id,submission_key,payload_hash,name,email,description,privacy_notice_version) values(${workspace}::uuid,${randomUUID()}::uuid,'fake-hash',${name},${email},'This is a fake project used only for local search checks.','lead-intake-v1')`;
    await context.addCookies([{name:'studio_session',value:token,url:'http://localhost:3100',httpOnly:true,sameSite:'Lax'}]);
    await page.goto('/studio/inquiries');
    await expect(page.getByRole('link',{name:'Fake Other Visitor'})).toBeVisible();
    // The term never enters a request URL, and so never a request log line.
    const urls:string[]=[];
    page.on('request',(r)=>urls.push(r.url()));
    await page.getByLabel('Search name, email, company').fill('fake-browser@example');
    await page.getByRole('button',{name:'Filter'}).click();
    // The first dev compile of the search action takes several seconds, as with the conversion route above.
    await expect(page.getByRole('link',{name:'Fake Other Visitor'})).toHaveCount(0,{timeout:30_000});
    await expect(page.getByRole('link',{name:'Fake Browser Visitor'})).toBeVisible();
    await page.getByLabel('Search name, email, company').fill('No Such Fake Visitor');
    await page.getByRole('button',{name:'Filter'}).click();
    await expect(page.getByText('No inquiries match these filters.')).toBeVisible({timeout:30_000});
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((u)=>/fake-browser|No[+ ]Such/i.test(decodeURIComponent(u)))).toEqual([]);
    await page.getByLabel('Search name, email, company').fill('');
    await page.getByRole('button',{name:'Filter'}).click();
    await expect(page.getByRole('link',{name:'Fake Other Visitor'})).toBeVisible({timeout:30_000});
  }finally{
    await q`delete from studio.inquiries where workspace_id=${workspace}::uuid`;
    await q`delete from studio.workspace_members where workspace_id=${workspace}::uuid`;
    await q`delete from studio.workspaces where id=${workspace}::uuid`;
    await q`delete from studio.owners where id=${owner}::uuid`;
  }
});
