import { describe, expect, it, vi } from 'vitest';
import type { BatchSummary, InvestmentRecord } from '@/lib/types';
import { batchDepositOf } from './useDeleteByDate';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const buy = (batchId: string | null, amount: number, batchDeposit?: number | null): InvestmentRecord => ({
  date: '2026-11-05', asset_key: 'snp', price: amount, quantity: 1, amount,
  batch_id: batchId, batch_deposit: batchDeposit,
});

const summary = (batchId: string, deposit: number): BatchSummary => ({
  batch_id: batchId, date: '2026-11-05', deposit, total_spent: 0, remaining_cash: 0,
});

describe('batchDepositOf', () => {
  it('uses the batch summary deposit, including 0 for cash-only buys', () => {
    const records = [buy('a', 300_000, 500_000), buy('b', 50_000, 0)];
    const history = { records, batchSummaries: [summary('a', 500_000), summary('b', 0)] };
    expect(batchDepositOf(history, '2026-11-05', 'a')).toBe(500_000);
    expect(batchDepositOf(history, '2026-11-05', 'b')).toBe(0);
  });

  it('falls back to batch_deposit, then to the buy total for old records', () => {
    const records = [buy('c', 100_000, 0), buy(null, 70_000), buy(null, 30_000)];
    const history = { records, batchSummaries: [] };
    expect(batchDepositOf(history, '2026-11-05', 'c')).toBe(0);
    expect(batchDepositOf(history, '2026-11-05', null)).toBe(100_000);
  });

  it('ignores sell records', () => {
    const sell: InvestmentRecord = { ...buy(null, 999), type: 'sell' };
    expect(batchDepositOf({ records: [sell], batchSummaries: [] }, '2026-11-05', null)).toBe(0);
  });
});
