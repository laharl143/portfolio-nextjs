import Link from 'next/link';
import {requireStudioAccess} from '@/studio/guard';
import {getReview} from '@/studio/retention/service';
import {card,textLink,pageEyebrow} from '../../../../_components/ui';
import {Counts,RecordSet,Boundaries,dateText,orNotFound} from '../../_components/Review';
import {HoldForm,PreviewForm} from '../../_components/Forms';
export default async function Page({params,searchParams}:{params:Promise<{kind:string;id:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  await requireStudioAccess();const {kind,id}=await params;const review=await orNotFound(()=>getReview(kind,id)),t=review.target;
  return <main className="container space-y-6 py-8"><Link className={textLink} href="/studio/retention">Back to retention</Link><header><p className={pageEyebrow}>{kind} · {t.state}</p><h1 className="mt-2 break-words text-3xl font-bold">{t.name}</h1><p className="mt-3">Archived: {dateText(t.archived_at)}. Due: {dateText(t.due_at)}.</p></header><Counts counts={review.counts}/>
    <div className="grid gap-6 lg:grid-cols-2"><section className={`${card} space-y-4 p-5`}><h2 className="text-xl font-bold">Removal eligibility</h2>{t.blockers.length>0?<ul className="list-disc space-y-2 pl-5">{t.blockers.map(b=><li key={b}>{b}</li>)}</ul>:<p>{t.state==='eligible'?'This record is eligible for review.':t.state==='live'?'This record is live and cannot be removed.':'The retention period has not ended.'}</p>}<Boundaries/>{t.state==='eligible'&&<PreviewForm kind={kind} id={id}/>}</section><section className={`${card} space-y-4 p-5`}><h2 className="text-xl font-bold">Business retention hold</h2><p className="text-sm">Preserve records needed for a contract, payment, dispute, or another business purpose. Holds remain until you explicitly release them.</p><HoldForm kind={kind} id={id} version={t.version} held={t.retention_hold} reason={t.retention_hold_reason}/>{kind==='contact'&&<p className="text-sm"><Link href={`/studio/retention/client/${t.client_id}`} className={textLink}>Review the parent client and its inherited hold</Link></p>}</section></div>
    <RecordSet review={review} params={await searchParams} base={`/studio/retention/${kind}/${id}`}/>
  </main>;
}
