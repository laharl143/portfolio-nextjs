import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/studio/guard',()=>({requireStudioAccess:vi.fn()}));
vi.mock('./service',()=>({confirmRemoval:vi.fn(),createPreview:vi.fn(),setHold:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:vi.fn(()=>{throw new Error('REDIRECT');})}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import {requireStudioAccess} from '@/studio/guard';
import {confirmRemoval} from './service';
import {confirmRetentionRemovalAction} from './actions';
beforeEach(()=>vi.clearAllMocks());
it('denies a signed out POST before accessing the data layer',async()=>{
  vi.mocked(requireStudioAccess).mockRejectedValue(new Error('DENIED'));
  await expect(confirmRetentionRemovalAction({ok:true},new FormData())).rejects.toThrow('DENIED');
  expect(confirmRemoval).not.toHaveBeenCalled();
});
it('cannot bypass confirmation by posting a preview UUID',async()=>{
  vi.mocked(requireStudioAccess).mockResolvedValue({ownerId:'owner',workspaceId:'workspace',sessionId:'session'});
  const result=await confirmRetentionRemovalAction({ok:true},new FormData());
  expect(result).toMatchObject({ok:false,code:'CONFIRM_REQUIRED'});
  expect(confirmRemoval).not.toHaveBeenCalled();
});
