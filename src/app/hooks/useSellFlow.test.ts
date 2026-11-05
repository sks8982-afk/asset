import { describe, expect, it, vi } from 'vitest';
import type { InvestmentRecord } from '@/lib/types';
import { countRecentSells, insertSellRecord, sellRoi } from './useSellFlow';
import { mockSupabaseTables } from './supabaseFake.test-util';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

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

describe('insertSellRecord', () => {
  const sell = { asset_key: 'tech10', quantity: 3, price: 18_000, amount: 54_000, date: '2026-11-01', reason: 'simplify' as const };

  it('saves one sell row with the chosen date and reports success', async () => {
    const calls = mockSupabaseTables();
    expect(await insertSellRecord(sell)).toBe(true);
    expect(calls).toEqual([
      'investment_records.insert({"date":"2026-11-01","asset_key":"tech10","price":18000,"quantity":3,"amount":54000,"type":"sell"})',
    ]);
  });

  it('reports failure instead of throwing', async () => {
    mockSupabaseTables({ investment_records: 'offline' });
    expect(await insertSellRecord(sell)).toBe(false);
  });
});
