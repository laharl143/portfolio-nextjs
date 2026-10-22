import {expect,test} from '@playwright/test';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {build} from 'esbuild';
import {resolve} from 'node:path';

test('AC-8: retention denies signed out access',async({page})=>{
  await page.goto('/studio/retention');
  await expect(page).toHaveURL(/\/studio\/login/);
  await expect(page.getByRole('heading',{name:'Client data retention'})).toHaveCount(0);
});

test('AC-1: keyboard retry fetches a fresh page instead of reusing a failed response',async({page})=>{
  // Run the real error component in a browser fixture. No shared database lock is needed.
  // esbuild is already supplied by the project's tsx toolchain.
  const source=resolve('src/app/(studio)/studio/(signed-in)/retention/error.tsx');
  const bundle=await build({
    stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import ErrorPage from ${JSON.stringify(source)};createRoot(document.getElementById('root')).render(React.createElement(ErrorPage));`,resolveDir:process.cwd(),loader:'tsx'},
    bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',
    define:{'process.env.NODE_ENV':'"production"'},
  });
  const script=bundle.outputFiles[0].text.replaceAll('</script','<\\/script');
  let documents=0;
  const url='http://retention-retry.test/';
  await page.route('http://retention-retry.test/**',async route=>{
    if(new URL(route.request().url()).pathname!=='/')return route.fulfill({status:404,body:''});
    documents++;
    await route.fulfill({status:200,contentType:'text/html',body:documents===1
      ?`<!doctype html><html><body><div id="root"></div><script>${script}</script></body></html>`
      :'<!doctype html><html><body><h1>Client data retention</h1></body></html>'});
  });
  await page.goto(url);
  await expect(page.getByRole('heading',{name:'Retention records are unavailable'})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Nothing was removed');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Try again'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'Client data retention',exact:true})).toBeVisible();
  expect(documents).toBe(2);
});
test('AC-1 AC-4 AC-5 AC-6: owner holds, reviews a stale preview, then removes only the fake confirmed set',async({page,context},testInfo)=>{
  test.setTimeout(240_000);
  if(!process.env.DATABASE_URL||process.env.VERCEL) throw new Error('Local development fixture only');
  const q=neon(process.env.DATABASE_URL),workspace=randomUUID(),owner=randomUUID(),client=randomUUID(),contact=randomUUID(),note=randomUUID(),token=randomBytes(32).toString('base64url');
  const title='FAKE Retention Browser Client';
  try {
    await q`insert into studio.workspaces(id,name,slug) values(${workspace}::uuid,'FAKE retention browser',${'fake-retention-browser-'+workspace})`;
    await q`insert into studio.owners(id,display_name) values(${owner}::uuid,'FAKE retention browser owner')`;
    await q`insert into studio.workspace_members(workspace_id,owner_id,role) values(${workspace}::uuid,${owner}::uuid,'owner')`;
    await q`insert into studio.sessions(token_hash,owner_id,workspace_id,expires_at) values(${createHash('sha256').update(token).digest('hex')},${owner}::uuid,${workspace}::uuid,now()+interval '1 hour')`;
    await q`insert into studio.clients(id,workspace_id,name,archived_at) values(${client}::uuid,${workspace}::uuid,${title},now()-interval '13 months')`;
    await q`insert into studio.contacts(id,workspace_id,client_id,full_name) values(${contact}::uuid,${workspace}::uuid,${client}::uuid,'FAKE Retention Contact')`;
    await q`insert into studio.notes(id,workspace_id,client_id,body) values(${note}::uuid,${workspace}::uuid,${client}::uuid,'FAKE private browser note')`;
    await context.addCookies([{name:'studio_session',value:token,url:'http://localhost:3100',httpOnly:true,sameSite:'Lax'}]);
    for(const path of [`client/${randomUUID()}`,`previews/${randomUUID()}`,`receipts/${randomUUID()}`]) {
      const response=await context.request.get(`/studio/retention/${path}`);
      expect(response.status(),`Missing retention resource ${path}`).toBe(404);
      expect(await response.text()).not.toContain(title);
    }
    await page.goto('/studio/retention');
    await expect(page.getByRole('heading',{name:'Client data retention',exact:true})).toBeVisible({timeout:30_000});
    await page.getByRole('link',{name:title,exact:true}).click();
    await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible({timeout:30_000});
    await page.getByLabel('Reason to retain').selectOption('dispute');
    await page.getByRole('button',{name:'Set retention hold',exact:true}).click();
    await expect(page.getByRole('button',{name:'Release retention hold',exact:true})).toBeVisible({timeout:30_000});
    await expect(page.getByRole('button',{name:'Review removal preview',exact:true})).toHaveCount(0);
    await page.getByLabel('I confirm this business hold can be released.').check();
    await page.getByRole('button',{name:'Release retention hold',exact:true}).click();
    await expect(page.getByRole('button',{name:'Review removal preview',exact:true})).toBeVisible({timeout:30_000});
    await page.getByRole('button',{name:'Review removal preview',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Review permanent removal',exact:true})).toBeVisible({timeout:30_000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath('retention-preview-light.png'),fullPage:true});
    await page.evaluate(()=>document.documentElement.classList.add('dark'));
    await page.screenshot({path:testInfo.outputPath('retention-preview-dark.png'),fullPage:true});
    await q`update studio.notes set body='FAKE changed browser note',updated_at=clock_timestamp() where workspace_id=${workspace}::uuid and id=${note}::uuid`;
    await page.getByRole('checkbox').check();await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await page.getByRole('button',{name:'Permanently remove these records',exact:true}).click();
    await expect(page.getByRole('alert').filter({hasText:'The records changed.'})).toBeVisible({timeout:30_000});
    await page.getByRole('link',{name:'Back to record review',exact:true}).click();
    await page.getByRole('button',{name:'Review removal preview',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Review permanent removal',exact:true})).toBeVisible({timeout:30_000});
    await page.getByRole('checkbox').check();await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await page.getByRole('button',{name:'Permanently remove these records',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Records permanently removed',exact:true})).toBeVisible({timeout:30_000});
    expect(page.url()).not.toContain('FAKE');
    expect((await q`select id from studio.clients where workspace_id=${workspace}::uuid and id=${client}::uuid`).length).toBe(0);
    await expect(page.getByText('FAKE private browser note')).toHaveCount(0);
    await page.getByRole('link',{name:'Back to retention',exact:true}).click();
    await expect(page.getByText('No archived records to review.')).toBeVisible({timeout:30_000});
  } finally {
    await q`delete from studio.retention_previews where workspace_id=${workspace}::uuid`;
    await q`delete from studio.retention_events where workspace_id=${workspace}::uuid`;
    await q`delete from studio.notes where workspace_id=${workspace}::uuid`;
    await q`delete from studio.contacts where workspace_id=${workspace}::uuid`;
    await q`delete from studio.clients where workspace_id=${workspace}::uuid`;
    await q`delete from studio.workspace_members where workspace_id=${workspace}::uuid`;
    await q`delete from studio.workspaces where id=${workspace}::uuid`;
    await q`delete from studio.owners where id=${owner}::uuid`;
  }
});

test('AC-7 AC-8: foreign records and previews stay private and missing resources return 404',async({page,context})=>{
  test.setTimeout(240_000);
  if(!process.env.DATABASE_URL||process.env.VERCEL||process.env.VERCEL_ENV)throw new Error('Local development fixture only');
  const q=neon(process.env.DATABASE_URL),workspace=randomUUID(),foreignWorkspace=randomUUID();
  const actors=[workspace,workspace,foreignWorkspace].map(workspace=>({workspace,id:randomUUID(),token:randomBytes(32).toString('base64url')}));
  const client=randomUUID(),foreignClient=randomUUID(),privateName='FAKE private retention target '+client,foreignName='FAKE foreign target '+foreignClient;
  const privateNote='FAKE private retention note '+randomUUID();
  const signIn=async(index:number)=>context.addCookies([{name:'studio_session',value:actors[index].token,url:'http://localhost:3100',httpOnly:true,sameSite:'Lax'}]);
  const expectHidden=async(path:string)=>{
    const response=await context.request.get(path);
    expect(response.status(),path).toBe(404);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    const body=await response.text();
    expect(body).toContain('Retention record not found');
    for(const value of [privateName,foreignName,privateNote])expect(body).not.toContain(value);
  };
  try{
    for(const id of [workspace,foreignWorkspace])await q`insert into studio.workspaces(id,name,slug) values(${id}::uuid,'FAKE retention access',${'fake-retention-access-'+id})`;
    for(const actor of actors){
      await q`insert into studio.owners(id,display_name) values(${actor.id}::uuid,'FAKE retention access owner')`;
      await q`insert into studio.workspace_members(workspace_id,owner_id,role) values(${actor.workspace}::uuid,${actor.id}::uuid,'owner')`;
      await q`insert into studio.sessions(token_hash,owner_id,workspace_id,expires_at) values(${createHash('sha256').update(actor.token).digest('hex')},${actor.id}::uuid,${actor.workspace}::uuid,now()+interval '1 hour')`;
    }
    await q`insert into studio.clients(id,workspace_id,name,archived_at) values(${client}::uuid,${workspace}::uuid,${privateName},now()-interval '13 months'),(${foreignClient}::uuid,${foreignWorkspace}::uuid,${foreignName},now()-interval '13 months')`;
    await q`insert into studio.notes(workspace_id,client_id,body) values(${workspace}::uuid,${client}::uuid,${privateNote})`;
    await signIn(0);
    await expectHidden(`/studio/retention/client/${foreignClient}`);
    await expectHidden('/studio/retention/client/not-a-uuid');
    await page.goto(`/studio/retention/client/${client}`);
    await expect(page.getByRole('heading',{name:privateName,exact:true})).toBeVisible({timeout:30_000});
    await page.getByRole('button',{name:'Review removal preview',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Review permanent removal',exact:true})).toBeVisible({timeout:30_000});
    const previewPath=new URL(page.url()).pathname;

    // Another valid owner in the SAME workspace cannot reuse this actor's preview.
    await signIn(1);
    await expectHidden(previewPath);
    await signIn(2);
    await expectHidden(`/studio/retention/client/${client}`);
    await expectHidden(previewPath);

    // Access attempts did not consume the preview or alter the removal set.
    await signIn(0);
    await page.goto(previewPath);
    await expect(page.getByText(privateNote,{exact:true})).toBeVisible({timeout:30_000});
    await page.getByRole('checkbox').check();
    await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await page.getByRole('button',{name:'Permanently remove these records',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Records permanently removed',exact:true})).toBeVisible({timeout:30_000});
    const receiptPath=new URL(page.url()).pathname;
    const receipt=await context.request.get(receiptPath);
    expect(receipt.status()).toBe(200);
    expect(await receipt.text()).not.toContain(privateNote);
    await signIn(2);
    await expectHidden(receiptPath);

    // Expired and forged session cookies must fall back to login, not reveal a target.
    await q`update studio.sessions set created_at=now()-interval '2 hours',expires_at=now()-interval '1 minute' where owner_id=${actors[2].id}::uuid and workspace_id=${foreignWorkspace}::uuid`;
    for(const token of [actors[2].token,actors[2].token+'tampered']){
      await context.addCookies([{name:'studio_session',value:token,url:'http://localhost:3100',httpOnly:true,sameSite:'Lax'}]);
      const denied=await context.request.get(`/studio/retention/client/${foreignClient}`,{maxRedirects:0});
      expect([303,307]).toContain(denied.status());
      expect(denied.headers().location).toContain('/studio/login');
      expect(await denied.text()).not.toContain(foreignName);
    }
    expect((await q`select id from studio.clients where workspace_id=${foreignWorkspace}::uuid and id=${foreignClient}::uuid`).length).toBe(1);
  }finally{
    for(const id of [workspace,foreignWorkspace]){
      await q`delete from studio.retention_previews where workspace_id=${id}::uuid`;
      await q`delete from studio.retention_events where workspace_id=${id}::uuid`;
      await q`delete from studio.notes where workspace_id=${id}::uuid`;
      await q`delete from studio.clients where workspace_id=${id}::uuid`;
      await q`delete from studio.sessions where workspace_id=${id}::uuid`;
      await q`delete from studio.workspace_members where workspace_id=${id}::uuid`;
      await q`delete from studio.workspaces where id=${id}::uuid`;
    }
    for(const actor of actors)await q`delete from studio.owners where id=${actor.id}::uuid`;
  }
});
