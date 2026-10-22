import {expect,test} from '@playwright/test';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';

// Spec 0012: the studio home dashboard over a throwaway fake workspace. Contracts get no status events (append only
// rows would pin the workspace), so their ages come from created_at.

test('AC-1: home denies signed out access',async({page})=>{
  await page.goto('/studio');
  await expect(page).toHaveURL(/\/studio\/login\?next=%2Fstudio$/);
  await expect(page.getByRole('list',{name:'What needs you'})).toHaveCount(0);
});

test('AC-2 AC-3 AC-4 AC-5 AC-8 AC-9 AC-12 AC-13: owner sees the dashboard in both themes without overflow',async({page,context},testInfo)=>{
  test.setTimeout(240_000);
  if(!process.env.DATABASE_URL||process.env.VERCEL||process.env.VERCEL_ENV)throw new Error('Local development fixture only');
  const q=neon(process.env.DATABASE_URL),workspace=randomUUID(),owner=randomUUID(),token=randomBytes(32).toString('base64url');
  const inquiry=randomUUID(),client=randomUUID(),archived=randomUUID();
  const email='fake-home-'+inquiry+'@example.invalid',description='FAKE private home description '+inquiry;
  try{
    await q`insert into studio.workspaces(id,name,slug) values(${workspace}::uuid,'FAKE home browser',${'fake-home-browser-'+workspace})`;
    await q`insert into studio.owners(id,display_name) values(${owner}::uuid,'FAKE home owner')`;
    await q`insert into studio.workspace_members(workspace_id,owner_id,role) values(${workspace}::uuid,${owner}::uuid,'owner')`;
    await q`insert into studio.sessions(token_hash,owner_id,workspace_id,expires_at) values(${createHash('sha256').update(token).digest('hex')},${owner}::uuid,${workspace}::uuid,now()+interval '1 hour')`;
    await q`insert into studio.inquiries(id,workspace_id,submission_key,payload_hash,name,email,description,company,privacy_notice_version,status,created_at) values(${inquiry}::uuid,${workspace}::uuid,${randomUUID()}::uuid,'fake-hash','FAKE Home Visitor',${email},${description},'FAKE Home Co','fake-v1','new',now()-interval '2 days')`;
    await q`insert into studio.inquiry_alerts(inquiry_id,state) values(${inquiry}::uuid,'failed')`;
    await q`insert into studio.clients(id,workspace_id,name,status) values(${client}::uuid,${workspace}::uuid,'FAKE Home Client','active')`;
    await q`insert into studio.clients(id,workspace_id,name,status,archived_at) values(${archived}::uuid,${workspace}::uuid,'FAKE Home Archived','past',now()-interval '13 months')`;
    await q`insert into studio.contracts(workspace_id,client_id,title,status,amount_minor,created_at) values(${workspace}::uuid,${client}::uuid,'FAKE Home Retainer','sent',987654321,now()-interval '3 days'),(${workspace}::uuid,${client}::uuid,'FAKE Home Draft','draft',null,now()-interval '1 hour')`;
    await context.addCookies([{name:'studio_session',value:token,url:'http://localhost:3100',httpOnly:true,sameSite:'Lax'}]);

    const html=await (await context.request.get('/studio')).text();
    for(const hidden of [email,description,'987654321','9,876,543.21'])expect(html,hidden).not.toContain(hidden);

    await page.goto('/studio');
    const strip=page.getByRole('list',{name:'What needs you'});
    await expect(strip).toBeVisible({timeout:30_000});
    const tiles=strip.getByRole('listitem');
    await expect(tiles).toHaveCount(4);
    await expect(tiles.nth(0)).toContainText('1 open · 1 alert failed');
    await expect(tiles.nth(1)).toContainText('1 sent · 1 draft');
    await expect(tiles.nth(2)).toContainText('Due for review');
    await expect(tiles.nth(3)).toContainText('Public export');

    const inquiries=page.getByRole('region',{name:'Inquiries'});
    await expect(inquiries.getByRole('link',{name:/FAKE Home Visitor/})).toHaveAttribute('href',`/studio/inquiries/${inquiry}`);
    await expect(inquiries).toContainText('Alert failed');
    await expect(inquiries).toContainText('2d');
    const contracts=page.getByRole('region',{name:'Contracts'});
    await expect(contracts.getByRole('listitem').first()).toContainText('FAKE Home Retainer');
    await expect(page.getByRole('region',{name:'Retention reviews due'}).getByRole('link',{name:/FAKE Home Archived/})).toHaveAttribute('href',`/studio/retention/client/${archived}`);

    const overview=page.getByRole('region',{name:'Overview'});
    await expect(overview.getByRole('link',{name:'Active 1'}).first()).toHaveAttribute('href','/studio/clients?status=active');
    await expect(overview.getByText('No projects yet')).toBeVisible();
    await expect(page.getByRole('region',{name:'System health'})).toContainText(/Connected, \d+ migrations applied/);

    // At 375px the strip is two columns; on desktop it is four.
    const columns=await strip.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(testInfo.project.name==='mobile'?2:4);
    for(const theme of ['light','dark']){
      if(theme==='dark')await page.evaluate(()=>document.documentElement.classList.add('dark'));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),theme).toBe(true);
      await page.screenshot({path:testInfo.outputPath(`studio-home-${theme}.png`),fullPage:true});
    }
  }finally{
    await q`delete from studio.inquiry_alerts where inquiry_id in (select id from studio.inquiries where workspace_id=${workspace}::uuid)`;
    await q`delete from studio.inquiries where workspace_id=${workspace}::uuid`;
    await q`delete from studio.contracts where workspace_id=${workspace}::uuid`;
    await q`delete from studio.clients where workspace_id=${workspace}::uuid`;
    await q`delete from studio.sessions where owner_id=${owner}::uuid`;
    await q`delete from studio.workspace_members where workspace_id=${workspace}::uuid`;
    await q`delete from studio.workspaces where id=${workspace}::uuid`;
    await q`delete from studio.owners where id=${owner}::uuid`;
  }
});
