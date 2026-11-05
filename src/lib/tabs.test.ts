import { describe, expect, it } from 'vitest';
import { parseTabHash, tabForKey } from './tabs';

describe('parseTabHash', () => {
  it('maps hashes to tabs and defaults to month', () => {
    expect(parseTabHash('#check')).toBe('check');
    expect(parseTabHash('records')).toBe('records');
    expect(parseTabHash('')).toBe('month');
    expect(parseTabHash('#')).toBe('month');
    expect(parseTabHash('#settings')).toBe('month');
    expect(parseTabHash('#PLAN')).toBe('month');
  });
});

describe('tabForKey', () => {
  it('moves with arrows (wrapping), Home and End', () => {
    expect(tabForKey('month', 'ArrowRight')).toBe('check');
    expect(tabForKey('records', 'ArrowRight')).toBe('month');
    expect(tabForKey('month', 'ArrowLeft')).toBe('records');
    expect(tabForKey('plan', 'Home')).toBe('month');
    expect(tabForKey('check', 'End')).toBe('records');
    expect(tabForKey('check', 'Enter')).toBeNull();
  });
});
