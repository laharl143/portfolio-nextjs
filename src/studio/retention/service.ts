import 'server-only';
import '@/studio/marker';
import { createHash, randomUUID } from 'node:crypto';
import { sql, type SQL } from 'drizzle-orm';
import { getDb, rows, workspaceLock } from '@/inquiries/db';
import type { Tx } from '@/studio/db/client';
import { getWorkspaceId } from '@/studio/data/workspace';
import { isUuid } from '@/studio/data/input';
import { pgErrorOf } from '@/studio/data/errors';
import { eligibility, HOLD_REASONS, kindOf, parseFilters, POLICY_VERSION, RetentionError, type Kind } from './rules';

type Reader = Pick<Tx,'execute'>;
export type Target = {
  id:string; kind:Kind; client_id:string; name:string; version:string;
  archived_at:string|null; due_at:string|null; is_due:boolean;
  retention_hold:boolean; retention_hold_reason:string|null;
  blockers:string[]; state:ReturnType<typeof eligibility>;
};
type Child = {id:string; name:string; version:string; archived_at:string|null; retention_hold:boolean; retention_hold_reason:string|null};
type Note = {id:string; body:string; version:string; client_id:string|null; contact_id:string|null};
type Parent = {id:string; version:string; retention_hold:boolean; retention_hold_reason:string|null};
export type Review = {target:Target; parent:Parent; contacts:Child[]; notes:Note[]; counts:{clients:number;contacts:number;notes:number}; hash:string};
type Preview = {id:string; kind:Kind;target_id:string;client_id:string;policy_version:string;snapshot_hash:string;expires_at:string;expired:boolean};
export type Receipt = {id:string; kind:Kind;target_id:string;policy_version:string;created_at:string;counts:Review['counts']};
function validId(id:string) { if(!isUuid(id)) throw new RetentionError('NOT_FOUND'); }
const due=(column:SQL)=>sql`((${column} at time zone 'UTC' + interval '12 months') at time zone 'UTC')`;
const table=(kind:Kind)=>kind==='client'?sql`studio.clients`:sql`studio.contacts`;
async function limits(tx:Tx) {
  await tx.execute(sql`set local lock_timeout = '3s'`);
  await tx.execute(sql`set local statement_timeout = '10s'`);
}
function translated(error:unknown):never {
  const code=pgErrorOf(error)?.code;
  if(code==='55P03'||code==='57014'||code==='40P01') throw new RetentionError('BUSY');
  if(code==='23503'||code==='23001') throw new RetentionError('DEPENDENCY_BLOCKED');
  throw error;
}
async function transaction<T>(fn:(tx:Tx,workspace:string)=>Promise<T>) {
  const workspace=await getWorkspaceId();
  try {return await getDb().transaction(async tx=>{await limits(tx);await workspaceLock(tx,workspace);return fn(tx,workspace);});}
  catch(error){return translated(error);}
}
export async function cleanupMetadata() {
  const workspace=await getWorkspaceId();
  try {await getDb().transaction(async tx=>{
    await limits(tx);
    await tx.execute(sql`delete from studio.retention_previews where workspace_id=${workspace}::uuid and id in (select id from studio.retention_previews where workspace_id=${workspace}::uuid and expires_at<=now() order by expires_at,id limit 1000)`);
    await tx.execute(sql`delete from studio.retention_events where workspace_id=${workspace}::uuid and id in (select id from studio.retention_events where workspace_id=${workspace}::uuid and ${due(sql`created_at`)}<=now() order by created_at,id limit 1000)`);
  });} catch(error){console.error('retentionCleanup',pgErrorOf(error)?.code??'UNAVAILABLE');}
}
// The same relational blocker predicate feeds list, review, preview and final confirmation.
function candidates(workspace:string) {
  return sql`select c.id,'client'::text as kind,c.id as client_id,c.name,c.updated_at::text as version,c.archived_at::text,
    ${due(sql`c.archived_at`)}::text as due_at,coalesce(${due(sql`c.archived_at`)}<=now(),false) as is_due,
    c.retention_hold,c.retention_hold_reason,
    array_remove(array[
      case when c.retention_hold then 'Client hold' end,
      case when exists(select 1 from studio.contacts x where x.workspace_id=${workspace}::uuid and x.client_id=c.id and x.retention_hold) then 'Contact hold' end,
      case when exists(select 1 from studio.projects x where x.workspace_id=${workspace}::uuid and x.client_id=c.id) then 'Related project' end,
      case when exists(select 1 from studio.contracts x where x.workspace_id=${workspace}::uuid and x.client_id=c.id) then 'Related contract' end,
      case when exists(select 1 from studio.inquiries x where x.workspace_id=${workspace}::uuid and (x.converted_client_id=c.id or x.converted_contact_id in (select id from studio.contacts where workspace_id=${workspace}::uuid and client_id=c.id))) then 'Source inquiry' end
    ],null) as blockers from studio.clients c where c.workspace_id=${workspace}::uuid
    union all
    select c.id,'contact'::text,c.client_id,c.full_name,c.updated_at::text,c.archived_at::text,
    ${due(sql`c.archived_at`)}::text,coalesce(${due(sql`c.archived_at`)}<=now(),false),c.retention_hold,c.retention_hold_reason,
    array_remove(array[
      case when c.retention_hold then 'Contact hold' end,
      case when p.retention_hold then 'Client hold' end,
      case when p.archived_at is not null then 'Parent client archived' end,
      case when exists(select 1 from studio.contracts x where x.workspace_id=${workspace}::uuid and x.client_id=c.client_id) then 'Related contract' end,
      case when exists(select 1 from studio.inquiries x where x.workspace_id=${workspace}::uuid and x.converted_contact_id=c.id) then 'Source inquiry' end
    ],null) from studio.contacts c join studio.clients p on p.id=c.client_id and p.workspace_id=${workspace}::uuid where c.workspace_id=${workspace}::uuid`;
}
// The list's classification, shared with the home dashboard so the two never disagree (spec 0012, AC-5).
function classified(workspace:string) {
  return sql`with candidates as (${candidates(workspace)}), classified as (select *,case when cardinality(blockers)>0 then 'blocked' when is_due then 'eligible' else 'waiting' end as state from candidates c where archived_at is not null and (kind='client' or not exists(select 1 from studio.clients p where p.workspace_id=${workspace}::uuid and p.id=c.client_id and p.archived_at is not null)))`;
}
export async function listRetention(params:Record<string,string|undefined>) {
  const workspace=await getWorkspaceId(); await cleanupMetadata(); const filters=parseFilters(params);
  return getDb().transaction(async tx=>{
    await tx.execute(sql`set transaction isolation level repeatable read`);await limits(tx);
    const base=classified(workspace);
    const filter=sql`(${filters.kind}='all' or kind=${filters.kind}) and (${filters.state}='all' or state=${filters.state})`;
    const [count]=await rows<{total:number}>(tx,sql`${base} select count(*)::int as total from classified where ${filter}`);
    const pages=Math.max(1,Math.ceil(count.total/50)),page=Math.min(filters.page,pages);
    const items=await rows<Target>(tx,sql`${base} select * from classified where ${filter} order by due_at::timestamptz,kind,id limit 50 offset ${(page-1)*50}`);
    return {items,total:count.total,pages,page,filters};
  });
}
async function snapshot(tx:Reader,workspace:string,kind:Kind,id:string,lock=false):Promise<Review> {
  validId(id);
  const [pre]=await rows<{client_id:string}>(tx,sql`select ${kind==='client'?sql`id`:sql`client_id`} as client_id from ${table(kind)} where workspace_id=${workspace}::uuid and id=${id}::uuid`);
  if(!pre) throw new RetentionError('NOT_FOUND');
  const [parent]=await rows<Parent>(tx,sql`select id,updated_at::text as version,retention_hold,retention_hold_reason from studio.clients where workspace_id=${workspace}::uuid and id=${pre.client_id}::uuid ${lock?sql`for update`:sql``}`);
  if(!parent) throw new RetentionError('NOT_FOUND');
  const [raw]=await rows<Target>(tx,sql`select * from (${candidates(workspace)}) c where c.kind=${kind} and c.id=${id}::uuid`);
  if(!raw) throw new RetentionError('NOT_FOUND');
  const contacts=await rows<Child>(tx,sql`select id,full_name as name,updated_at::text as version,archived_at::text,retention_hold,retention_hold_reason from studio.contacts where workspace_id=${workspace}::uuid and client_id=${parent.id}::uuid and (${kind}='client' or id=${id}::uuid) order by id ${lock?sql`for update`:sql``}`);
  const notes=await rows<Note>(tx,sql`select id,body,updated_at::text as version,client_id,contact_id from studio.notes where workspace_id=${workspace}::uuid and ((${kind}='client' and client_id=${parent.id}::uuid) or contact_id in (select id from studio.contacts where workspace_id=${workspace}::uuid and client_id=${parent.id}::uuid and (${kind}='client' or id=${id}::uuid))) order by id ${lock?sql`for update`:sql``}`);
  const dependencies=await rows<{kind:string;id:string;version:string}>(tx,sql`
    select 'contract' as kind,id,updated_at::text as version from studio.contracts where workspace_id=${workspace}::uuid and client_id=${parent.id}::uuid
    union all select 'project',id,updated_at::text from studio.projects where workspace_id=${workspace}::uuid and client_id=${parent.id}::uuid and ${kind}='client'
    union all select 'inquiry',id,updated_at::text from studio.inquiries where workspace_id=${workspace}::uuid and ((${kind}='client' and converted_client_id=${parent.id}::uuid) or converted_contact_id in (select id from studio.contacts where workspace_id=${workspace}::uuid and client_id=${parent.id}::uuid and (${kind}='client' or id=${id}::uuid))) order by kind,id`);
  const target:Target={...raw,state:eligibility(!!raw.archived_at,raw.is_due,raw.blockers)};
  const counts={clients:kind==='client'?1:0,contacts:contacts.length,notes:notes.length};
  const meta={policy:POLICY_VERSION,kind,id,parent,target:{version:raw.version,archived:raw.archived_at,hold:raw.retention_hold,reason:raw.retention_hold_reason},contacts:contacts.map(c=>({id:c.id,version:c.version,archived:c.archived_at,hold:c.retention_hold,reason:c.retention_hold_reason})),notes:notes.map(n=>({id:n.id,version:n.version,client:n.client_id,contact:n.contact_id})),dependencies};
  return {target,parent,contacts,notes,counts,hash:createHash('sha256').update(JSON.stringify(meta)).digest('hex')};
}
export async function getReview(kindInput:string,id:string) {
  const kind=kindOf(kindInput),workspace=await getWorkspaceId();await cleanupMetadata();
  return getDb().transaction(async tx=>{await tx.execute(sql`set transaction isolation level repeatable read`);await limits(tx);return snapshot(tx,workspace,kind,id);});
}
function removable(review:Review) {
  if(review.target.state!=='eligible') throw new RetentionError('NOT_ELIGIBLE');
  if(Object.values(review.counts).reduce((a,b)=>a+b,0)>1000) throw new RetentionError('TOO_LARGE');
}
export async function createPreview(kindInput:string,id:string,actor:string) {
  const kind=kindOf(kindInput);validId(id);validId(actor);await cleanupMetadata();
  return transaction(async(tx,workspace)=>{
    const review=await snapshot(tx,workspace,kind,id,true);removable(review);const preview=randomUUID();
    await tx.execute(sql`insert into studio.retention_previews(id,workspace_id,actor_user_id,kind,target_id,client_id,policy_version,snapshot_hash) values(${preview}::uuid,${workspace}::uuid,${actor}::uuid,${kind},${id}::uuid,${review.parent.id}::uuid,${POLICY_VERSION},${review.hash})`);
    return preview;
  });
}
async function readPreview(tx:Reader,workspace:string,id:string,actor:string,lock=false) {
  const [preview]=await rows<Preview>(tx,sql`select id,kind,target_id,client_id,policy_version,snapshot_hash,expires_at::text,expires_at<=clock_timestamp() as expired from studio.retention_previews where workspace_id=${workspace}::uuid and actor_user_id=${actor}::uuid and id=${id}::uuid ${lock?sql`for update`:sql``}`);
  if(!preview) throw new RetentionError('NOT_FOUND');return preview;
}
export async function getPreview(id:string,actor:string) {
  validId(id);validId(actor);const workspace=await getWorkspaceId();
  await cleanupMetadata();
  const result=await getDb().transaction(async tx=>{
    await tx.execute(sql`set transaction isolation level repeatable read`);await limits(tx);
    const preview=await readPreview(tx,workspace,id,actor);
    if(preview.expired) return {preview,review:null,problem:'PREVIEW_EXPIRED'};
    try {const review=await snapshot(tx,workspace,preview.kind,preview.target_id);
      return {preview,review,problem:preview.policy_version!==POLICY_VERSION||preview.snapshot_hash!==review.hash||review.target.state!=='eligible'?'STALE_PREVIEW':null};
    } catch(error){if(error instanceof RetentionError&&error.code==='NOT_FOUND') return {preview,review:null,problem:'STALE_PREVIEW'};throw error;}
  });return result;
}
async function receipt(tx:Reader,workspace:string,id:string,actor?:string) {
  const [found]=await rows<Receipt>(tx,sql`select id,kind,target_id,policy_version,created_at::text,counts from studio.retention_events where workspace_id=${workspace}::uuid and id=${id}::uuid and action='remove' and ${due(sql`created_at`)}>now() ${actor?sql`and actor_user_id=${actor}::uuid`:sql``}`);
  return found;
}
export async function getReceipt(id:string) {
  validId(id);const workspace=await getWorkspaceId();await cleanupMetadata();const found=await receipt(getDb(),workspace,id);
  if(!found) throw new RetentionError('NOT_FOUND');return found;
}
export async function confirmRemoval(id:string,actor:string) {
  validId(id);validId(actor);
  await cleanupMetadata();
  const result=await transaction(async(tx,workspace)=>{
    if(await receipt(tx,workspace,id,actor)) return id;
    const preview=await readPreview(tx,workspace,id,actor,true);
    if(preview.expired) throw new RetentionError('PREVIEW_EXPIRED');
    const review=await snapshot(tx,workspace,preview.kind,preview.target_id,true);
    if(preview.policy_version!==POLICY_VERSION||preview.snapshot_hash!==review.hash) throw new RetentionError('STALE_PREVIEW');
    removable(review);
    // Expiry can elapse while waiting for the parent lock.
    const [clock]=await rows<{expired:boolean}>(tx,sql`select ${preview.expires_at}::timestamptz<=clock_timestamp() as expired`);
    if(clock.expired) throw new RetentionError('PREVIEW_EXPIRED');
    const deletedNotes=await rows(tx,sql`delete from studio.notes where workspace_id=${workspace}::uuid and ((${preview.kind}='client' and client_id=${review.parent.id}::uuid) or contact_id in (select id from studio.contacts where workspace_id=${workspace}::uuid and client_id=${review.parent.id}::uuid and (${preview.kind}='client' or id=${preview.target_id}::uuid))) returning id`);
    const deletedContacts=await rows(tx,sql`delete from studio.contacts where workspace_id=${workspace}::uuid and client_id=${review.parent.id}::uuid and (${preview.kind}='client' or id=${preview.target_id}::uuid) returning id`);
    const deletedClients=preview.kind==='client'?await rows(tx,sql`delete from studio.clients where workspace_id=${workspace}::uuid and id=${preview.target_id}::uuid returning id`):[];
    if(deletedNotes.length!==review.counts.notes||deletedContacts.length!==review.counts.contacts||deletedClients.length!==review.counts.clients) throw new RetentionError('STALE_PREVIEW');
    await tx.execute(sql`insert into studio.retention_events(id,workspace_id,actor_user_id,kind,target_id,action,policy_version,counts) values(${id}::uuid,${workspace}::uuid,${actor}::uuid,${preview.kind},${preview.target_id}::uuid,'remove',${POLICY_VERSION},${JSON.stringify(review.counts)}::jsonb)`);
    await tx.execute(sql`delete from studio.retention_previews where workspace_id=${workspace}::uuid and id=${id}::uuid`);
    return id;
  });return result;
}
export async function setHold(kindInput:string,id:string,version:string,hold:boolean,reason:string,actor:string) {
  const kind=kindOf(kindInput);validId(id);validId(actor);
  if(!version || (hold&&!HOLD_REASONS.includes(reason as typeof HOLD_REASONS[number]))) throw new RetentionError('INVALID_INPUT');
  await cleanupMetadata();
  return transaction(async(tx,workspace)=>{
    const review=await snapshot(tx,workspace,kind,id,true),target=review.target;
    if(target.retention_hold===hold&&(!hold||target.retention_hold_reason===reason)) return;
    if(target.version!==version) throw new RetentionError('STALE_RECORD');
    await tx.execute(sql`update ${table(kind)} set retention_hold=${hold},retention_hold_reason=${hold?reason:null},updated_at=clock_timestamp() where workspace_id=${workspace}::uuid and id=${id}::uuid`);
    await tx.execute(sql`insert into studio.retention_events(workspace_id,actor_user_id,kind,target_id,action,policy_version,reason,counts) values(${workspace}::uuid,${actor}::uuid,${kind},${id}::uuid,${hold?'hold_set':'hold_release'},${POLICY_VERSION},${hold?reason:target.retention_hold_reason},'{"clients":0,"contacts":0,"notes":0}'::jsonb)`);
  });
}
// Home dashboard signal (spec 0012, AC-5): eligible records, earliest due first. Read only, no metadata cleanup.
export async function getRetentionAttention(limit:number) {
  const workspace=await getWorkspaceId();
  return getDb().transaction(async tx=>{
    await tx.execute(sql`set transaction isolation level repeatable read`);await limits(tx);
    const base=classified(workspace);
    const [count]=await rows<{total:number}>(tx,sql`${base} select count(*)::int as total from classified where state='eligible'`);
    const items=await rows<{kind:Kind;id:string;name:string;due_at:string}>(tx,sql`${base} select kind,id,name,due_at from classified where state='eligible' order by due_at::timestamptz,id limit ${limit}`);
    return {eligible:count.total,rows:items.map(({kind,id,name,due_at})=>({kind,id,name,dueAt:due_at}))};
  });
}
