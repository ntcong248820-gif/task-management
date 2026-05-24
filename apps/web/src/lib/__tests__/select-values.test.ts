import { describe, expect, it } from 'vitest';
import { SELECT_ALL_VALUE, SELECT_NONE_VALUE, nullableSelectResult, nullableSelectValue, optionalFilterValue } from '../select-values';

describe('select sentinel values', () => {
  it('uses non-empty sentinel values for Radix Select items', () => {
    expect(SELECT_ALL_VALUE).not.toBe('');
    expect(SELECT_NONE_VALUE).not.toBe('');
  });

  it('maps all filters to omitted API params', () => {
    expect(optionalFilterValue(SELECT_ALL_VALUE)).toBeUndefined();
    expect(optionalFilterValue('active')).toBe('active');
  });

  it('maps nullable entity selectors without empty item values', () => {
    expect(nullableSelectValue(null)).toBe(SELECT_NONE_VALUE);
    expect(nullableSelectValue('goal-1')).toBe('goal-1');
    expect(nullableSelectResult(SELECT_NONE_VALUE)).toBeNull();
    expect(nullableSelectResult('goal-1')).toBe('goal-1');
  });
});
