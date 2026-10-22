import Link from 'next/link';
import {requireStudioAccess} from '@/studio/guard';
import {getReceipt} from '@/studio/retention/service';
import {card,textLink} from '../../../../_components/ui';
import {Counts,dateText,orNotFound} from '../../_components/Review';
export default async function Page({params}:{params:Promise<{eventId:string}>}) {
  await requireStudioAccess();const {eventId}=await params,receipt=await orNotFound(()=>getReceipt(eventId));
  return <main className="container space-y-6 py-8"><header><p className="text-sm font-semibold uppercase tracking-widest">Removal receipt</p><h1 className="mt-2 text-3xl font-bold">Records permanently removed</h1><p className="mt-3">Completed {dateText(receipt.created_at)}. Repeating the same confirmation will not remove more records.</p></header><Counts counts={receipt.counts}/><dl className={`${card} space-y-4 break-all p-5`}><div><dt className="font-semibold">Operation</dt><dd>{receipt.id}</dd></div><div><dt className="font-semibold">Target</dt><dd>{receipt.kind} · {receipt.target_id}</dd></div><div><dt className="font-semibold">Policy</dt><dd>{receipt.policy_version}</dd></div></dl><p className="text-sm">This receipt contains counts and identifiers, not names or message text. It expires after 12 calendar months.</p><Link className={textLink} href="/studio/retention">Back to retention</Link></main>;
}
