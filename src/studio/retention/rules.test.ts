import { describe, expect, it } from 'vitest';
import { eligibility, parseFilters, requireConfirmation } from './rules';

describe('retention policy', () => {
  it('never expires a live record and gives blockers precedence over waiting', () => {
    expect(eligibility(false, false, [])).toBe('live');
    expect(eligibility(true, false, ['hold'])).toBe('blocked');
    expect(eligibility(true, false, [])).toBe('waiting');
    expect(eligibility(true, true, [])).toBe('eligible');
  });
  it('rejects forged filters and unsafe page values', () => {
    expect(parseFilters({ kind: 'bad', state: 'bad', page: '-3' })).toEqual({kind:'all',state:'all',page:1});
    expect(parseFilters({kind:'contact',state:'eligible',page:'2'})).toEqual({kind:'contact',state:'eligible',page:2});
  });
  it('requires both explicit acknowledgement and the exact confirmation word', () => {
    expect(() => requireConfirmation(false, 'DELETE')).toThrow();
    expect(() => requireConfirmation(true, 'delete')).toThrow();
    expect(() => requireConfirmation(true, 'DELETE')).not.toThrow();
  });
});
