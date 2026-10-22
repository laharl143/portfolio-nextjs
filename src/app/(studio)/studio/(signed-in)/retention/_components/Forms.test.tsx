// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('@/studio/retention/actions',()=>({createRetentionPreviewAction:vi.fn(),confirmRetentionRemovalAction:vi.fn(),setRetentionHoldAction:vi.fn()}));
import {HoldForm,RemovalForm} from './Forms';
afterEach(cleanup);
it('requires an acknowledgement and exact confirmation before removal',()=>{
  render(<RemovalForm id="fake-preview"/>);
  expect(screen.getByRole('checkbox')).toBeRequired();
  expect(screen.getByLabelText('Type DELETE to confirm')).toBeRequired();
  expect(screen.getByLabelText('Type DELETE to confirm')).toHaveAttribute('pattern','DELETE');
  expect(screen.getByRole('button',{name:'Permanently remove these records'})).toBeVisible();
});
it('requires explicit release consent and shows the recorded reason',()=>{
  render(<HoldForm kind="client" id="fake" version="fake" held reason="dispute"/>);
  expect(screen.getByRole('checkbox')).toBeRequired();
  expect(screen.getByText(/Current reason: dispute/)).toBeVisible();
  expect(screen.getByRole('button',{name:'Release retention hold'})).toBeVisible();
});
