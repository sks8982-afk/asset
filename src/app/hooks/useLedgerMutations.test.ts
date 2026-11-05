import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteLedgerRows } from './useLedgerMutations';
import { mockSupabaseTables } from './supabaseFake.test-util';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const NIL = '00000000-0000-0000-0000-000000000000';
const MAIN_TABLES = [
  `investment_records.delete().neq(id,${NIL})`,
  `monthly_budgets.delete().neq(id,${NIL})`,
  `dividends.delete().neq(id,${NIL})`,
];
const AUX_TABLES = [
  'cash_balance_snapshots.delete().neq(date,1970-01-01)',
  `batch_summaries.delete().neq(batch_id,${NIL})`,
];

describe('deleteLedgerRows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the ledger tables, then the snapshot and batch summary tables', async () => {
    const calls = mockSupabaseTables();
    await deleteLedgerRows();
    expect(calls).toEqual([...MAIN_TABLES, ...AUX_TABLES]);
  });

  it('fails when the batch summaries cannot be deleted', async () => {
    mockSupabaseTables({ batch_summaries: 'permission denied' });
    await expect(deleteLedgerRows()).rejects.toMatchObject({ message: 'permission denied' });
  });

  it('fails when the cash snapshots cannot be deleted', async () => {
    mockSupabaseTables({ cash_balance_snapshots: 'permission denied' });
    await expect(deleteLedgerRows()).rejects.toMatchObject({ message: 'permission denied' });
  });

  it('leaves the snapshot and summary tables alone when a ledger table fails', async () => {
    const calls = mockSupabaseTables({ monthly_budgets: 'offline' });
    await expect(deleteLedgerRows()).rejects.toMatchObject({ message: 'offline' });
    expect(calls).toEqual(MAIN_TABLES);
  });
});
