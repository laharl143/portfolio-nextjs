import { expect, test, type BrowserContext } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes, randomUUID } from "node:crypto";

async function fixture(context:BrowserContext){
  if(!process.env.DATABASE_URL||process.env.VERCEL||process.env.VERCEL_ENV)throw Error("Development fake records only");
  const q=neon(process.env.DATABASE_URL),workspace=randomUUID(),owner=randomUUID(),client=randomUUID(),contract=randomUUID(),token=randomBytes(32).toString("base64url");
  await q`insert into studio.workspaces(id,name,slug) values(${workspace}::uuid,'FAKE invoicing browser',${'fake-invoice-browser-'+workspace})`;
  await q`insert into studio.owners(id,display_name) values(${owner}::uuid,'FAKE Invoice Owner')`;
  await q`insert into studio.workspace_members(workspace_id,owner_id,role) values(${workspace}::uuid,${owner}::uuid,'owner')`;
  await q`insert into studio.sessions(token_hash,owner_id,workspace_id,expires_at) values(${createHash('sha256').update(token).digest('hex')},${owner}::uuid,${workspace}::uuid,now()+interval '1 hour')`;
  await q`insert into studio.clients(id,workspace_id,name,status) values(${client}::uuid,${workspace}::uuid,'FAKE Invoice Browser Client','active')`;
  await q`insert into studio.contracts(id,workspace_id,client_id,title,status,amount_minor) values(${contract}::uuid,${workspace}::uuid,${client}::uuid,'FAKE Storefront Build','active',15000000)`;
  await context.addCookies([{name:"studio_session",value:token,url:"http://localhost:3100",httpOnly:true,sameSite:"Lax"}]);
  return {q,workspace,owner,client,contract,token,close:()=>q`delete from studio.sessions where owner_id=${owner}::uuid`};
}

test("AC-13: signed out invoice pages and PDF return only a login redirect",async({request})=>{
  for(const path of ["/studio/invoices","/studio/invoices/profile",`/studio/invoices/${randomUUID()}/pdf`]){
    const response=await request.get(path,{maxRedirects:0});expect(response.status()).toBe(307);expect(response.headers().location).toContain("/studio/login");expect(response.headers()["content-type"]??"").not.toContain("application/pdf");
  }
});

test("AC-1 AC-2 AC-3 AC-4 AC-5 AC-6 AC-7 AC-10 AC-11 AC-15: owner creates, edits a stale draft, then discards it",async({page,context},testInfo)=>{
  test.setTimeout(240000);const f=await fixture(context);
  // Opening events are immutable. The fake workspace and discarded invoice intentionally remain; only the
  // temporary session is removed. This fixture never calls Blob or sends an invoice to a real client.
  try{
    await page.goto(`/studio/contracts/${f.contract}`);await page.getByRole("link",{name:"New invoice",exact:true}).click();
    await expect(page.getByRole("textbox",{name:"Description",exact:true})).toHaveValue("FAKE Storefront Build");
    await expect(page.getByRole("textbox",{name:"Unit price (PHP)",exact:true})).toHaveValue("150000.00");
    await page.getByRole("textbox",{name:"Description",exact:true}).fill("FAKE ₱ ñ “quote” – work");await page.getByRole("textbox",{name:"Qty",exact:true}).fill("0.33");await page.getByRole("textbox",{name:"Unit price (PHP)",exact:true}).fill("100.01");
    await expect(page.getByText("Total PHP 33.00",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Save draft",exact:true}).click();
    await expect(page).toHaveURL(/\/studio\/invoices\/[0-9a-f-]+$/);const url=page.url(),id=url.split("/").pop()!;
    await expect(page.getByRole("heading",{name:"Draft",exact:true})).toBeVisible();await expect(page.getByText("Created",{exact:true})).toBeVisible();
    const pdf=await context.request.get(url+"/pdf");expect(pdf.status()).toBe(200);expect(pdf.headers()["cache-control"]).toBe("private, no-store");expect(pdf.headers()["x-content-type-options"]).toBe("nosniff");expect((await pdf.body()).subarray(0,4).toString()).toBe("%PDF");
    await page.getByRole("button",{name:"Mark sent",exact:true}).click();await page.getByRole("alertdialog").getByRole("button",{name:"Mark sent",exact:true}).click();await expect(page.getByRole("alert")).toContainText("Complete your billing profile before sending.");await page.getByRole("alertdialog").getByRole("button",{name:"Cancel",exact:true}).click();
    await page.goto("/studio/invoices/profile");await page.getByLabel("Business name",{exact:true}).fill("FAKE Browser Billing");await page.getByLabel("Address",{exact:true}).fill("FAKE Manila");await page.getByLabel("Payment instructions",{exact:true}).fill("FAKE transfer instructions");await page.getByLabel("TIN").fill("12a");await page.getByLabel("Email").fill("x@y");await page.getByRole("button",{name:"Save profile"}).click();await expect(page.getByText("Use digits and hyphens only.",{exact:true})).toBeVisible();await expect(page.getByText("Enter an email like name@example.com.",{exact:true})).toBeVisible();await page.getByLabel("TIN").fill("123-456");await page.getByLabel("Email").fill("fake@example.invalid");await page.getByRole("button",{name:"Save profile"}).click();await expect(page).toHaveURL(/profile\?saved=1$/);
    const stale=await context.newPage();await stale.goto(url);await stale.getByRole("button",{name:"Mark sent",exact:true}).click();
    await page.goto(url+"/edit");await page.getByRole("textbox",{name:"Unit price (PHP)",exact:true}).fill("200");await page.getByRole("button",{name:"Save changes",exact:true}).click();await expect(page).toHaveURL(url,{timeout:30000});
    await stale.getByRole("alertdialog").getByRole("button",{name:"Mark sent",exact:true}).click();await expect(stale.getByRole("alert")).toContainText("This was changed elsewhere. Reload to see the latest.");await stale.close();
    const counters=await f.q`select last_number from studio.invoice_number_counters where workspace_id=${f.workspace}::uuid`;expect(counters).toHaveLength(0);
    for(const theme of ["light","dark"]){await page.evaluate(t=>document.documentElement.classList.toggle("dark",t==="dark"),theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`invoice-${theme}.png`),fullPage:true});}
    await page.getByRole("button",{name:"Discard draft",exact:true}).click();await page.getByRole("alertdialog").getByRole("button",{name:"Discard draft",exact:true}).click();await expect(page).toHaveURL(`/studio/contracts/${f.contract}`,{timeout:30000});
    await page.goto(url);await expect(page.getByText(/Discarded on/)).toBeVisible();await expect(page.getByRole("button",{name:"Mark sent",exact:true})).toHaveCount(0);await page.goto("/studio/invoices?archived=1");await expect(page.getByRole("link",{name:"Draft",exact:true})).toHaveAttribute("href",`/studio/invoices/${id}`);
  }finally{await f.close();}
});

test("AC-13: malformed, foreign, tampered and expired access reveal no invoice",async({context,page})=>{
  test.setTimeout(120000);const f=await fixture(context),foreignWorkspace=randomUUID(),foreignClient=randomUUID(),foreignContract=randomUUID(),foreignInvoice=randomUUID();
  try{
    await f.q`insert into studio.workspaces(id,name,slug) values(${foreignWorkspace}::uuid,'FAKE foreign invoice browser',${'fake-foreign-'+foreignWorkspace})`;
    await f.q`insert into studio.clients(id,workspace_id,name) values(${foreignClient}::uuid,${foreignWorkspace}::uuid,'FAKE foreign secret client')`;
    await f.q`insert into studio.contracts(id,workspace_id,client_id,title,status) values(${foreignContract}::uuid,${foreignWorkspace}::uuid,${foreignClient}::uuid,'FAKE foreign secret contract','active')`;
    await f.q`insert into studio.invoices(id,workspace_id,client_id,contract_id,payment_terms_days,currency) values(${foreignInvoice}::uuid,${foreignWorkspace}::uuid,${foreignClient}::uuid,${foreignContract}::uuid,15,'PHP')`;
    for(const id of ["malformed",foreignInvoice]){const response=await context.request.get(`/studio/invoices/${id}/pdf`);expect(response.status()).toBe(404);expect(await response.text()).not.toContain("FAKE foreign secret");}
    await context.addCookies([{name:"studio_session",value:f.token+"tampered",url:"http://localhost:3100"}]);await page.goto("/studio/invoices");await expect(page).toHaveURL(/\/studio\/login/);
    await f.q`update studio.sessions set created_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' where owner_id=${f.owner}::uuid`;await context.addCookies([{name:"studio_session",value:f.token,url:"http://localhost:3100"}]);const expired=await context.request.get(`/studio/invoices/${foreignInvoice}/pdf`,{maxRedirects:0});expect(expired.status()).toBe(307);expect(expired.headers().location).toContain("/studio/login");
  }finally{await f.close();}
});
