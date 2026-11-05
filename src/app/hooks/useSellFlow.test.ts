import { describe, expect, it, vi } from 'vitest';
import type { InvestmentRecord } from '@/lib/types';
import { countRecentSells, sellRoi } from './useSellFlow';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const rec = (type: 'buy' | 'sell', date: string): InvestmentRecord => ({
  date, asset_key: 'tech10', price: 1, quantity: 1, amount: 1, type,
});

describe('countRecentSells', () => {
  it('counts sells dated within the last 30 days up to today', () => {
    const records = [
      rec('sell', '2026-10-06'), // 30일 전 → 제외
      rec('sell', '2026-10-07'),
      rec('sell', '2026-11-05'),
      rec('sell', '2026-11-06'), // 미래 날짜 → 제외
      rec('buy', '2026-11-01'),
    ];
    expect(countRecentSells(records, '2026-11-05')).toBe(2);
    expect(countRecentSells(records, '2026-03-01')).toBe(0);
  });

  it('crosses month and year boundaries', () => {
    expect(countRecentSells([rec('sell', '2025-12-20')], '2026-01-05')).toBe(1);
    expect(countRecentSells([rec('sell', '2026-02-27')], '2026-03-01')).toBe(1);
  });
});

describe('sellRoi', () => {
  it('compares the sell price with the moving-average cost', () => {
    expect(sellRoi(25_000, 20_000)).toBeCloseTo(-20);
    expect(sellRoi(25_000, 30_000)).toBeCloseTo(20);
    expect(sellRoi(0, 30_000)).toBe(0);
  });
});
