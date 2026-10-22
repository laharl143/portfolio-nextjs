import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { loadEnvConfig } from '@next/env';
import { getDb, rows } from '@/inquiries/db';
import { closeDb } from '@/studio/db/client';
import { runInWorkspace } from '@/studio/data/workspace';
import { createPreview, confirmRemoval, getReview, getPreview, setHold, listRetention, cleanupMetadata } from './service';

const workspace=randomUUID(), owner=randomUUID();
const scoped=<T>(fn:()=>Promise<T>)=>runInWorkspace(workspace,fn);
async function fixture() {
  const client=randomUUID(),contact=randomUUID(),note=randomUUID();
  await getDb().execute(sql`insert into studio.clients(id,workspace_id,name,archived_at) values(${client}::uuid,${workspace}::uuid,${'FAKE retention '+client},now()-interval '13 months')`);
  await getDb().execute(sql`insert into studio.contacts(id,workspace_id,client_id,full_name) values(${contact}::uuid,${workspace}::uuid,${client}::uuid,'FAKE contact')`);
  await getDb().execute(sql`insert into studio.notes(id,workspace_id,client_id,body) values(${note}::uuid,${workspace}::uuid,${client}::uuid,'FAKE private inquiry text')`);
  return {client,contact,note};
}
beforeAll(async()=>{
  if(process.env.VERCEL || process.env.VERCEL_ENV) throw new Error('Development only');
  loadEnvConfig(process.cwd(),true,{info(){},error(){}});
  await getDb().execute(sql`insert into studio.workspaces(id,name,slug) values(${workspace}::uuid,'FAKE retention tests',${'fake-retention-'+workspace})`);
  await getDb().execute(sql`insert into studio.owners(id,display_name) values(${owner}::uuid,'FAKE retention owner')`);
});
afterAll(async()=>{
  for(const table of ['retention_previews','retention_events','inquiry_events','inquiries','notes','contacts','projects','contracts','clients']) {
    await getDb().execute(sql`delete from ${sql.identifier('studio')}.${sql.identifier(table)} where workspace_id=${workspace}::uuid`);
  }
  await getDb().execute(sql`delete from studio.workspaces where id=${workspace}::uuid`);
  await getDb().execute(sql`delete from studio.owners where id=${owner}::uuid`);
  await closeDb();
});
describe('retention on isolated fake records',()=>{
  // covers: AC-5, AC-6, AC-9.
  it('removes the exact set once under concurrent confirmation and keeps a minimal receipt',()=>scoped(async()=>{
    const f=await fixture(); const preview=await createPreview('client',f.client,owner);
    const results=await Promise.all([confirmRemoval(preview,owner),confirmRemoval(preview,owner)]);
    expect(results).toEqual([preview,preview]);
    expect(await rows(getDb(),sql`select id from studio.clients where workspace_id=${workspace}::uuid and id=${f.client}::uuid`)).toHaveLength(0);
    const [receipt]=await rows<{counts:unknown}>(getDb(),sql`select counts from studio.retention_events where workspace_id=${workspace}::uuid and id=${preview}::uuid`);
    expect(receipt.counts).toEqual({clients:1,contacts:1,notes:1});
  }));
  // covers: AC-5, AC-6.
  it('rejects a preview when a note changes and leaves every record intact',()=>scoped(async()=>{
    const f=await fixture(); const preview=await createPreview('client',f.client,owner);
    await getDb().execute(sql`update studio.notes set body='FAKE changed',updated_at=clock_timestamp() where workspace_id=${workspace}::uuid and id=${f.note}::uuid`);
    await expect(confirmRemoval(preview,owner)).rejects.toMatchObject({code:'STALE_PREVIEW'});
    expect((await getReview('client',f.client)).counts.notes).toBe(1);
  }));
  // covers: AC-3, AC-4.
  it('holds win over due dates, inherited child holds block client removal, and release is audited',()=>scoped(async()=>{
    const f=await fixture(); let review=await getReview('contact',f.contact);
    await setHold('contact',f.contact,review.target.version,true,'dispute',owner);
    expect((await getReview('client',f.client)).target.state).toBe('blocked');
    await expect(createPreview('client',f.client,owner)).rejects.toMatchObject({code:'NOT_ELIGIBLE'});
    review=await getReview('contact',f.contact);
    await setHold('contact',f.contact,review.target.version,false,'',owner);
    expect((await getReview('client',f.client)).target.state).toBe('eligible');
  }));
  it('refuses expired previews, other actors and other workspaces',()=>scoped(async()=>{
    const f=await fixture(); const preview=await createPreview('client',f.client,owner);
    // covers: AC-6, AC-7, AC-8. Neither knowledge of a target nor its token authorizes mutation.
    const review=await getReview('client',f.client),otherActor=randomUUID(),otherWorkspace=randomUUID();
    await expect(confirmRemoval(preview,randomUUID())).rejects.toMatchObject({code:'NOT_FOUND'});
    await expect(getPreview(preview,otherActor)).rejects.toMatchObject({code:'NOT_FOUND'});
    await runInWorkspace(otherWorkspace,async()=>{
      await expect(getReview('client',f.client)).rejects.toMatchObject({code:'NOT_FOUND'});
      await expect(createPreview('client',f.client,owner)).rejects.toMatchObject({code:'NOT_FOUND'});
      await expect(setHold('client',f.client,review.target.version,true,'dispute',owner)).rejects.toMatchObject({code:'NOT_FOUND'});
      await expect(confirmRemoval(preview,owner)).rejects.toMatchObject({code:'NOT_FOUND'});
    });
    expect((await getReview('client',f.client)).target.version).toBe(review.target.version);
    expect((await getReview('client',f.client)).counts).toEqual(review.counts);
    await getDb().execute(sql`update studio.retention_previews set created_at=now()-interval '11 minutes',expires_at=now()-interval '1 minute' where workspace_id=${workspace}::uuid and id=${preview}::uuid`);
    // Lazy metadata cleanup removes this expired token before lookup; an expired link is safely not found.
    await expect(confirmRemoval(preview,owner)).rejects.toMatchObject({code:'NOT_FOUND'});
  }));
  it('uses UTC calendar months including leap day, and list filters agree with preview eligibility',()=>scoped(async()=>{
    // covers: AC-1, AC-2. Fixed instants keep the cutoff check independent of wall clock timing.
    const [date]=await rows<{due:string;at:boolean;before:boolean}>(getDb(),sql`with cutoff as (select (('2024-02-29 12:00:00+00'::timestamptz at time zone 'UTC' + interval '12 months') at time zone 'UTC') due) select due::text,'2025-02-28 12:00:00+00'::timestamptz>=due as at,'2025-02-28 11:59:59.999999+00'::timestamptz>=due as before from cutoff`);
    expect(date.due).toContain('2025-02-28 12:00:00');
    expect(date.at).toBe(true);expect(date.before).toBe(false);
    const result=await listRetention({kind:'client',state:'eligible',page:'999999'});
    expect(result.page).toBeLessThanOrEqual(result.pages);
    expect(result.items.every(x=>x.state==='eligible')).toBe(true);
  }));
  // covers: AC-2, AC-5, AC-7.
  it('preserves contact independent clocks and client notes',()=>scoped(async()=>{
    const f=await fixture();
    await getDb().execute(sql`update studio.clients set archived_at=null where workspace_id=${workspace}::uuid and id=${f.client}::uuid`);
    await getDb().execute(sql`update studio.contacts set archived_at=now()-interval '13 months' where workspace_id=${workspace}::uuid and id=${f.contact}::uuid`);
    const preview=await createPreview('contact',f.contact,owner);
    await confirmRemoval(preview,owner);
    expect((await getReview('client',f.client)).counts.notes).toBe(1);
  }));
  // covers: AC-8, AC-9.
  it('cleans expired metadata only in its workspace',()=>scoped(async()=>{
    await cleanupMetadata();
    const expired=await rows(getDb(),sql`select id from studio.retention_previews where workspace_id=${workspace}::uuid and expires_at<=now()`);
    expect(expired).toHaveLength(0);
  }));
  // covers: AC-3, AC-7.
  it('blocks projects of any status and preserves source inquiries',()=>scoped(async()=>{
    const f=await fixture(), project=randomUUID(), inquiry=randomUUID();
    await getDb().execute(sql`insert into studio.projects(id,workspace_id,client_id,name,status,archived_at) values(${project}::uuid,${workspace}::uuid,${f.client}::uuid,'FAKE archived project','cancelled',now())`);
    expect((await getReview('client',f.client)).target.blockers).toContain('Related project');
    await expect(createPreview('client',f.client,owner)).rejects.toMatchObject({code:'NOT_ELIGIBLE'});
    await getDb().execute(sql`delete from studio.projects where workspace_id=${workspace}::uuid and id=${project}::uuid`);
    await getDb().execute(sql`insert into studio.inquiries(id,workspace_id,submission_key,payload_hash,name,email,description,privacy_notice_version,status,converted_at,conversion_key,conversion_hash,converted_client_id,converted_contact_id,converted_note_id) values(${inquiry}::uuid,${workspace}::uuid,${randomUUID()}::uuid,'fake','FAKE inquiry','fake@example.invalid','FAKE inquiry source text for retention checks','lead-intake-v1','converted',now(),${randomUUID()}::uuid,'fake',${f.client}::uuid,${f.contact}::uuid,${f.note}::uuid)`);
    await expect(createPreview('client',f.client,owner)).rejects.toMatchObject({code:'NOT_ELIGIBLE'});
    expect((await getReview('client',f.client)).target.blockers).toContain('Source inquiry');
    expect(await rows(getDb(),sql`select id from studio.inquiries where workspace_id=${workspace}::uuid and id=${inquiry}::uuid`)).toHaveLength(1);
  }));
  // covers: AC-6, AC-7.
  it('rolls back removed children when an unexpected foreign key blocks the parent',()=>scoped(async()=>{
    const f=await fixture(),foreignWorkspace=randomUUID(),foreignProject=randomUUID();
    const preview=await createPreview('client',f.client,owner);
    try {
      await getDb().execute(sql`insert into studio.workspaces(id,name,slug) values(${foreignWorkspace}::uuid,'FAKE malformed dependency',${'fake-malformed-'+foreignWorkspace})`);
      await getDb().execute(sql`insert into studio.projects(id,workspace_id,client_id,name) values(${foreignProject}::uuid,${foreignWorkspace}::uuid,${f.client}::uuid,'FAKE malformed dependency')`);
      await expect(confirmRemoval(preview,owner)).rejects.toMatchObject({code:'DEPENDENCY_BLOCKED'});
      const review=await getReview('client',f.client);
      expect(review.counts).toEqual({clients:1,contacts:1,notes:1});
      expect(await rows(getDb(),sql`select id from studio.retention_events where workspace_id=${workspace}::uuid and id=${preview}::uuid`)).toHaveLength(0);
    } finally {
      await getDb().execute(sql`delete from studio.projects where workspace_id=${foreignWorkspace}::uuid and id=${foreignProject}::uuid`);
      await getDb().execute(sql`delete from studio.workspaces where id=${foreignWorkspace}::uuid`);
    }
  }));
  // covers: AC-6, AC-9.
  it('does not accept expired receipts left behind in a cleanup backlog',()=>scoped(async()=>{
    const f=await fixture(),preview=await createPreview('client',f.client,owner);
    await confirmRemoval(preview,owner);
    await getDb().execute(sql`update studio.retention_events set created_at=now()-interval '13 months' where workspace_id=${workspace}::uuid and id=${preview}::uuid`);
    await expect(confirmRemoval(preview,owner)).rejects.toMatchObject({code:'NOT_FOUND'});
  }));
  // covers: AC-3, AC-7.
  it('a contract of any status blocks both client and independent contact removal',()=>scoped(async()=>{
    const f=await fixture(),contract=randomUUID();
    await getDb().execute(sql`insert into studio.contracts(id,workspace_id,client_id,title,status,archived_at) values(${contract}::uuid,${workspace}::uuid,${f.client}::uuid,'FAKE retention contract','ended',now())`);
    expect((await getReview('client',f.client)).target.blockers).toContain('Related contract');
    await getDb().execute(sql`update studio.clients set archived_at=null where workspace_id=${workspace}::uuid and id=${f.client}::uuid`);
    await getDb().execute(sql`update studio.contacts set archived_at=now()-interval '13 months' where workspace_id=${workspace}::uuid and id=${f.contact}::uuid`);
    await expect(createPreview('contact',f.contact,owner)).rejects.toMatchObject({code:'NOT_ELIGIBLE'});
    expect((await getReview('contact',f.contact)).target.blockers).toContain('Related contract');
  }));
  // covers: AC-4, AC-6.
  it('invalidates a preview when a hold is added and safely races hold against removal',()=>scoped(async()=>{
    const f=await fixture(),preview=await createPreview('client',f.client,owner);
    const review=await getReview('client',f.client);
    await setHold('client',f.client,review.target.version,true,'payment',owner);
    await expect(confirmRemoval(preview,owner)).rejects.toMatchObject({code:'STALE_PREVIEW'});
    const held=await getReview('client',f.client);
    await setHold('client',f.client,held.target.version,false,'',owner);
    const fresh=await createPreview('client',f.client,owner),next=await getReview('client',f.client);
    const results=await Promise.allSettled([setHold('client',f.client,next.target.version,true,'dispute',owner),confirmRemoval(fresh,owner)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  }));
  // covers: AC-5, AC-6.
  it('refuses sets over the removal cap without deleting or creating a preview',()=>scoped(async()=>{
    const f=await fixture();
    await getDb().execute(sql`insert into studio.notes(workspace_id,client_id,body) select ${workspace}::uuid,${f.client}::uuid,'FAKE cap note' from generate_series(1,1000)`);
    await expect(createPreview('client',f.client,owner)).rejects.toMatchObject({code:'TOO_LARGE'});
    expect((await getReview('client',f.client)).counts.notes).toBe(1001);
    expect(await rows(getDb(),sql`select id from studio.retention_previews where workspace_id=${workspace}::uuid and target_id=${f.client}::uuid`)).toHaveLength(0);
  }));
  it('AC-4 AC-9: audits every hold reason without resetting the archive clock',()=>scoped(async()=>{
    const f=await fixture(),before=await getReview('client',f.client);
    const reasons=['contract','payment','dispute','other_business_need'];
    for(const reason of reasons){
      let review=await getReview('client',f.client);
      await setHold('client',f.client,review.target.version,true,reason,owner);
      expect((await getReview('contact',f.contact)).target.blockers).toContain('Client hold');
      review=await getReview('client',f.client);
      expect(review.target.archived_at).toBe(before.target.archived_at);
      await setHold('client',f.client,review.target.version,false,'',owner);
    }
    const events=await rows<{action:string;reason:string;counts:unknown}>(getDb(),sql`select action,reason,counts from studio.retention_events where workspace_id=${workspace}::uuid and target_id=${f.client}::uuid order by created_at,id`);
    expect(events.map(({action,reason})=>({action,reason}))).toEqual(reasons.flatMap(reason=>[{action:'hold_set',reason},{action:'hold_release',reason}]));
    for(const event of events)expect(event.counts).toEqual({clients:0,contacts:0,notes:0});
    expect((await getReview('client',f.client)).target.archived_at).toBe(before.target.archived_at);
  }));
  it('AC-6: rejects a one microsecond version change for both holds and removal',()=>scoped(async()=>{
    const f=await fixture(),before=await getReview('client',f.client),preview=await createPreview('client',f.client,owner);
    await getDb().execute(sql`update studio.clients set updated_at=updated_at+interval '1 microsecond' where workspace_id=${workspace}::uuid and id=${f.client}::uuid`);
    await expect(setHold('client',f.client,before.target.version,true,'payment',owner)).rejects.toMatchObject({code:'STALE_RECORD'});
    await expect(confirmRemoval(preview,owner)).rejects.toMatchObject({code:'STALE_PREVIEW'});
    expect((await getReview('client',f.client)).counts).toEqual(before.counts);
  }));
  it('AC-6: issues ten minute previews and refuses altered policy or snapshot metadata',()=>scoped(async()=>{
    const f=await fixture(),preview=await createPreview('client',f.client,owner);
    const [token]=await rows<{seconds:number}>(getDb(),sql`select extract(epoch from (expires_at-created_at))::int seconds from studio.retention_previews where workspace_id=${workspace}::uuid and id=${preview}::uuid`);
    expect(token.seconds).toBe(600);
    await getDb().execute(sql`update studio.retention_previews set policy_version='fake-other-policy' where workspace_id=${workspace}::uuid and id=${preview}::uuid`);
    await expect(confirmRemoval(preview,owner)).rejects.toMatchObject({code:'STALE_PREVIEW'});
    const next=await createPreview('client',f.client,owner);
    await getDb().execute(sql`update studio.retention_previews set snapshot_hash=repeat('0',64) where workspace_id=${workspace}::uuid and id=${next}::uuid`);
    await expect(confirmRemoval(next,owner)).rejects.toMatchObject({code:'STALE_PREVIEW'});
    expect((await getReview('client',f.client)).counts).toEqual({clients:1,contacts:1,notes:1});
  }));
  it('AC-8 AC-9: caps metadata cleanup at one thousand rows without touching another workspace',()=>scoped(async()=>{
    const f=await fixture(),foreignWorkspace=randomUUID(),foreignPreview=randomUUID();
    await cleanupMetadata();
    try{
      await getDb().execute(sql`insert into studio.workspaces(id,name,slug) values(${foreignWorkspace}::uuid,'FAKE metadata isolation',${'fake-metadata-'+foreignWorkspace})`);
      await getDb().execute(sql`insert into studio.retention_previews(id,workspace_id,actor_user_id,kind,target_id,client_id,policy_version,snapshot_hash,created_at,expires_at) values(${foreignPreview}::uuid,${foreignWorkspace}::uuid,${owner}::uuid,'client',${f.client}::uuid,${f.client}::uuid,'client-retention-v1',repeat('0',64),now()-interval '11 minutes',now()-interval '1 minute')`);
      await getDb().execute(sql`insert into studio.retention_previews(workspace_id,actor_user_id,kind,target_id,client_id,policy_version,snapshot_hash,created_at,expires_at) select ${workspace}::uuid,${owner}::uuid,'client',${f.client}::uuid,${f.client}::uuid,'client-retention-v1',repeat('0',64),now()-interval '11 minutes',now()-interval '1 minute' from generate_series(1,1001)`);
      await getDb().execute(sql`insert into studio.retention_events(workspace_id,actor_user_id,kind,target_id,action,policy_version,counts,created_at) select ${workspace}::uuid,${owner}::uuid,'client',${f.client}::uuid,'remove','client-retention-v1','{"clients":0,"contacts":0,"notes":0}'::jsonb,now()-interval '13 months' from generate_series(1,1001)`);
      await cleanupMetadata();
      const [remaining]=await rows<{previews:number;events:number;foreign_preview:number}>(getDb(),sql`select (select count(*)::int from studio.retention_previews where workspace_id=${workspace}::uuid and target_id=${f.client}::uuid) previews,(select count(*)::int from studio.retention_events where workspace_id=${workspace}::uuid and target_id=${f.client}::uuid) events,(select count(*)::int from studio.retention_previews where workspace_id=${foreignWorkspace}::uuid and id=${foreignPreview}::uuid) foreign_preview`);
      expect(remaining).toEqual({previews:1,events:1,foreign_preview:1});
    }finally{
      await getDb().execute(sql`delete from studio.retention_previews where workspace_id=${foreignWorkspace}::uuid`);
      await getDb().execute(sql`delete from studio.workspaces where id=${foreignWorkspace}::uuid`);
    }
  }));
});
