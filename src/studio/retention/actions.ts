'use server';
import 'server-only';
import '@/studio/marker';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStudioAccess} from '@/studio/guard';
import type {ActionState} from '@/studio/clients/action-state';
import {confirmRemoval,createPreview,setHold} from './service';
import {kindOf,messages,requireConfirmation,RetentionError} from './rules';
const str=(data:FormData,key:string)=>String(data.get(key)??'');
function failure(error:unknown):ActionState {
  const code=error instanceof RetentionError?error.code:'UNAVAILABLE';
  if(!(error instanceof RetentionError)) console.error('retentionAction',error instanceof Error?error.name:'UNAVAILABLE');
  return {ok:false,code,message:messages[code]??messages.UNAVAILABLE};
}
function invalidate(){revalidatePath('/studio/retention','layout');revalidatePath('/studio/clients','layout');}
export async function createRetentionPreviewAction(_prev:ActionState,data:FormData):Promise<ActionState> {
  const session=await requireStudioAccess();let id:string;
  try {id=await createPreview(str(data,'kind'),str(data,'id'),session.ownerId);}catch(error){return failure(error);}
  redirect(`/studio/retention/previews/${id}`);
}
export async function confirmRetentionRemovalAction(_prev:ActionState,data:FormData):Promise<ActionState> {
  const session=await requireStudioAccess();let id:string;
  try {requireConfirmation(data.get('acknowledged')==='on',str(data,'confirmation'));id=await confirmRemoval(str(data,'previewId'),session.ownerId);}catch(error){return failure(error);}
  invalidate();redirect(`/studio/retention/receipts/${id}`);
}
export async function setRetentionHoldAction(_prev:ActionState,data:FormData):Promise<ActionState> {
  const session=await requireStudioAccess();let kind:string,id:string;
  try {
    kind=kindOf(str(data,'kind'));id=str(data,'id');
    const value=str(data,'hold');if(!['true','false'].includes(value)) throw new RetentionError('INVALID_INPUT');
    if(value==='false'&&data.get('releaseAcknowledged')!=='on') throw new RetentionError('INVALID_INPUT');
    await setHold(kind,id,str(data,'version'),value==='true',str(data,'reason'),session.ownerId);
  }catch(error){return failure(error);}
  invalidate();redirect(`/studio/retention/${kind}/${id}`);
}
