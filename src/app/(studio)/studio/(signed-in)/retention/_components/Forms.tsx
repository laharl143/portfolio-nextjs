'use client';
import {useActionState} from 'react';
import type {ActionState} from '@/studio/clients/action-state';
import {createRetentionPreviewAction,confirmRetentionRemovalAction,setRetentionHoldAction} from '@/studio/retention/actions';
import {HOLD_REASONS} from '@/studio/retention/rules';
import {alertBox,primaryButton,dangerSolidButton,input,label} from '../../../_components/ui';
function Form({action,children,title,danger=false}:{action:(prev:ActionState,data:FormData)=>Promise<ActionState>;children:React.ReactNode;title:string;danger?:boolean}) {
  const [state,submit,pending]=useActionState(action,{ok:true} as ActionState);
  return <form action={submit} className="space-y-4">
    {children}
    {!state.ok&&<p role="alert" className={alertBox}>{state.message}</p>}
    <button disabled={pending} className={danger?dangerSolidButton:primaryButton}>{pending?'Working…':title}</button>
  </form>;
}
export function PreviewForm({kind,id}:{kind:string;id:string}) {
  return <Form action={createRetentionPreviewAction} title="Review removal preview"><input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={id}/><p className="text-sm">Creating a preview does not remove anything. You will review the exact set before confirming.</p></Form>;
}
export function RemovalForm({id}:{id:string}) {
  return <Form action={confirmRetentionRemovalAction} title="Permanently remove these records" danger>
    <input type="hidden" name="previewId" value={id}/>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="acknowledged" required className="mt-1 h-4 w-4 accent-red-700"/><span>I have reviewed every record in this preview and understand this cannot be undone in the live database.</span></label>
    <label className={label}>Type DELETE to confirm<input className={input} name="confirmation" required autoComplete="off" spellCheck={false} pattern="DELETE"/></label>
  </Form>;
}
export function HoldForm({kind,id,version,held,reason}:{kind:string;id:string;version:string;held:boolean;reason:string|null}) {
  return <Form action={setRetentionHoldAction} title={held?'Release retention hold':'Set retention hold'}>
    <input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={id}/><input type="hidden" name="version" value={version}/><input type="hidden" name="hold" value={held?'false':'true'}/>
    {held?<><p className="text-sm">Current reason: {reason?.replaceAll('_',' ')}. Releasing this hold does not bypass other blockers.</p><label className="flex items-start gap-3 text-sm"><input type="checkbox" name="releaseAcknowledged" required className="mt-1 h-4 w-4"/><span>I confirm this business hold can be released.</span></label></>:<label className={label}>Reason to retain<select className={input} name="reason" defaultValue="contract">{HOLD_REASONS.map(r=><option key={r} value={r}>{r.replaceAll('_',' ')}</option>)}</select></label>}
  </Form>;
}
