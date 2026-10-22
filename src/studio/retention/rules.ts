export const POLICY_VERSION = 'client-retention-v1';
export const HOLD_REASONS = ['contract', 'payment', 'dispute', 'other_business_need'] as const;
export type Kind = 'client' | 'contact';
export class RetentionError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'RetentionError'; }
}
export function kindOf(value: string): Kind {
  if (value !== 'client' && value !== 'contact') throw new RetentionError('NOT_FOUND');
  return value;
}
export function eligibility(archived: boolean, due: boolean, blockers: readonly string[]) {
  return !archived ? 'live' : blockers.length ? 'blocked' : due ? 'eligible' : 'waiting';
}
export function pageNumber(value?: string) {
  return value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 1;
}
export function parseFilters(params: Record<string, string | undefined>) {
  return {
    kind: ['client', 'contact'].includes(params.kind ?? '') ? params.kind! : 'all',
    state: ['eligible', 'blocked', 'waiting'].includes(params.state ?? '') ? params.state! : 'all',
    page: pageNumber(params.page),
  };
}
export function requireConfirmation(acknowledged: boolean, word: string) {
  if (!acknowledged || word !== 'DELETE') throw new RetentionError('CONFIRM_REQUIRED');
}
export const messages: Record<string, string> = {
  NOT_FOUND: 'This record is no longer available.',
  NOT_ELIGIBLE: 'This record is not eligible. Review its due date and blockers.',
  STALE_PREVIEW: 'The records changed. Create a fresh preview before removing anything.',
  PREVIEW_EXPIRED: 'This preview expired. Create a fresh preview.',
  STALE_RECORD: 'The hold changed. Reload this page before trying again.',
  CONFIRM_REQUIRED: 'Check the acknowledgement and type DELETE exactly.',
  INVALID_INPUT: 'Check the hold reason and confirmation.',
  TOO_LARGE: 'This removal exceeds 1,000 records. Nothing was removed. This slice cannot process this set.',
  DEPENDENCY_BLOCKED: 'A related record prevents removal. Nothing was removed. Create a fresh preview.',
  BUSY: 'The database is busy. Nothing changed. Please try again.',
  UNAVAILABLE: 'This request could not be completed. Please try again later.',
};
