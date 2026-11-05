import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLedger } from './useAppData';
import { mockSupabaseTables } from './supabaseFake.test-util';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const tables = {
  monthly_budgets: [{ id: 'm1', month_date: '2026-11-05', amount: 500_000 }],
  investment_records: [{ id: 'r1', date: '2026-11-05', asset_key: 'snp', price: 25_500, quantity: 13, amount: 331_500 }],
  cash_balance_snapshots: [{ date: '2026-11-05T00:00:00', balance: '168500' }],
  batch_summaries: [{ batch_id: 'b1', date: '2026-11-05', deposit: '500000', total_spent: 331_500, remaining_cash: null }],
  dividends: [{ id: 'd1', date: '2026-10-31', asset_key: 'snp', amount: '12000', is_reinvested: 0, note: null }],
};

describe('fetchLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads all five ledger tables and normalizes the rows', async () => {
    const calls = mockSupabaseTables({}, tables);
    expect(await fetchLedger()).toEqual({
      budgets: tables.monthly_budgets,
      records: tables.investment_records,
      snapshots: [{ date: '2026-11-05', balance: 168_500 }],
      batchSummaries: [{ batch_id: 'b1', date: '2026-11-05', deposit: 500_000, total_spent: 331_500, remaining_cash: 0 }],
      dividends: [{ id: 'd1', date: '2026-10-31', asset_key: 'snp', amount: 12_000, is_reinvested: false, note: '' }],
    });
    expect(calls).toEqual([
      'monthly_budgets.select(*).order(month_date)',
      'investment_records.select(*).order(date)',
      'cash_balance_snapshots.select(date, balance).order(date)',
      'batch_summaries.select(batch_id, date, deposit, total_spent, remaining_cash)',
      'dividends.select(*).order(date)',
    ]);
  });

  it.each(Object.keys(tables))('fails instead of returning an empty ledger when %s cannot be read', async (table) => {
    mockSupabaseTables({ [table]: 'permission denied for table' }, tables);
    await expect(fetchLedger()).rejects.toMatchObject({ message: 'permission denied for table' });
  });

  it('treats a missing data array as no rows', async () => {
    mockSupabaseTables();
    expect(await fetchLedger()).toEqual({ budgets: [], records: [], snapshots: [], batchSummaries: [], dividends: [] });
  });
});
