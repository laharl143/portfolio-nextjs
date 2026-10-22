import Link from 'next/link';
import {requireStudioAccess} from '@/studio/guard';
import {getPreview} from '@/studio/retention/service';
import {messages} from '@/studio/retention/rules';
import {card,textLink,alertBox} from '../../../../_components/ui';
import {Counts,RecordSet,Boundaries,dateText,orNotFound} from '../../_components/Review';
import {RemovalForm} from '../../_components/Forms';
export default async function Page({params,searchParams}:{params:Promise<{previewId:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const session=await requireStudioAccess(),{previewId}=await params;
  const {preview,review,problem}=await orNotFound(()=>getPreview(previewId,session.ownerId));
  return <main className="container space-y-6 py-8"><Link className={textLink} href={`/studio/retention/${preview.kind}/${preview.target_id}`}>Back to record review</Link><header><h1 className="text-3xl font-bold">Review permanent removal</h1><p className="mt-3">Preview expires {dateText(preview.expires_at)}. Review every page before confirming.</p></header>{problem&&<p role="alert" className={alertBox}>{messages[problem]}</p>}{review&&<><section className={`${card} space-y-4 p-5`}><h2 className="break-words text-xl font-bold">{review.target.name}</h2><p>Due {dateText(review.target.due_at)}</p><Boundaries/><Counts counts={review.counts}/></section><RecordSet review={review} params={await searchParams} base={`/studio/retention/previews/${previewId}`}/></>}{!problem&&<section className={`${card} space-y-4 p-5`}><h2 className="text-xl font-bold">Confirm removal</h2><RemovalForm id={previewId}/></section>}</main>;
}
