import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Review} from '@/studio/retention/service';
import {RetentionError,pageNumber} from '@/studio/retention/rules';
import {formatDateTime} from '@/studio/format';
import {card,textLink} from '../../../_components/ui';
import Paging from '../../../_components/Paging';
export async function orNotFound<T>(fn:()=>Promise<T>) {
  try{return await fn();}catch(error){if(error instanceof RetentionError&&error.code==='NOT_FOUND') notFound();throw error;}
}
export const dateText=(value:string|null)=>value?formatDateTime(new Date(value)):'Not archived';
export function Counts({counts}:{counts:Review['counts']}) {
  return <dl className="grid grid-cols-3 gap-3">{Object.entries(counts).map(([key,count])=><div key={key} className={`${card} p-4`}><dt className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-300">{key}</dt><dd className="mt-1 text-2xl font-bold">{count}</dd></div>)}</dl>;
}
export function RecordSet({review,params,base}:{review:Review;params:Record<string,string|undefined>;base:string}) {
  const contactsPage=Math.min(pageNumber(params.contactsPage),Math.max(1,Math.ceil(review.contacts.length/50)));
  const notesPage=Math.min(pageNumber(params.notesPage),Math.max(1,Math.ceil(review.notes.length/50)));
  const href=(key:string,page:number)=>{const p=new URLSearchParams();p.set('contactsPage',String(contactsPage));p.set('notesPage',String(notesPage));p.set(key,String(page));return `${base}?${p}`;};
  return <div className="grid gap-6 lg:grid-cols-2">
    <section className={`${card} p-5`}><h2 className="text-lg font-bold">Contacts ({review.contacts.length})</h2>{!review.contacts.length?<p className="mt-3 text-sm">No contacts in this removal set.</p>:<ul className="mt-3 divide-y divide-stone-300 dark:divide-stone-700">{review.contacts.slice((contactsPage-1)*50,contactsPage*50).map(c=><li key={c.id} className="space-y-1 py-3"><Link className={textLink} href={`/studio/retention/contact/${c.id}`}>{c.name}</Link><p className="text-sm">{c.retention_hold?`Hold: ${c.retention_hold_reason?.replaceAll('_',' ')}`:'No contact hold'}</p><p className="text-xs text-stone-600 dark:text-stone-300">Archived: {dateText(c.archived_at)}</p></li>)}</ul>}<Paging page={contactsPage} pageSize={50} total={review.contacts.length} hrefFor={p=>href('contactsPage',p)}/></section>
    <section className={`${card} p-5`}><h2 className="text-lg font-bold">Notes ({review.notes.length})</h2>{!review.notes.length?<p className="mt-3 text-sm">No notes in this removal set.</p>:<ul className="mt-3 divide-y divide-stone-300 dark:divide-stone-700">{review.notes.slice((notesPage-1)*50,notesPage*50).map(n=><li key={n.id} className="py-3"><p className="text-xs text-stone-600 dark:text-stone-300">{n.client_id?'Client note':'Contact note'} · {n.id}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{n.body}</p></li>)}</ul>}<Paging page={notesPage} pageSize={50} total={review.notes.length} hrefFor={p=>href('notesPage',p)}/></section>
  </div>;
}
export function Boundaries(){return <div className="space-y-2 text-sm text-stone-700 dark:text-stone-300"><p>Removal is irreversible in the live database. This removes only the records shown here. Other free text, historical backups, exported files, and third party copies are not searched or erased.</p><p>Contracts, their history and PDFs, projects, systems, and source inquiries are preserved. Source inquiries must expire through their existing policy first.</p></div>;}
