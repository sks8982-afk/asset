import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BatchSummary, InvestmentRecord } from '@/lib/types';
import {
  batchDepositOf, deleteBatchesWithDeposits, describeDeleteOutcome, groupBatches,
  planBudgetSubtraction, planDepositSubtractions, type DeleteOutcome,
} from './useDeleteByDate';
import { mockSupabaseTables } from './supabaseFake.test-util';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const buy = (
  batchId: string | null, amount: number, batchDeposit?: number | null, date = '2026-11-05',
): InvestmentRecord => ({
  date, asset_key: 'snp', price: amount, quantity: 1, amount, batch_id: batchId, batch_deposit: batchDeposit,
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

describe('groupBatches', () => {
  it('lists the latest date first and numbers saves of the same day', () => {
    const records = [buy('b', 1), buy(null, 1), buy('a', 1), buy('a', 2), { ...buy('z', 5, null, '2026-10-05'), type: 'sell' as const }];
    expect(groupBatches(records)).toEqual([
      { key: '2026-11-05|null', date: '2026-11-05', batchId: null, count: 1, sellCount: 0, nth: 1 },
      { key: '2026-11-05|a', date: '2026-11-05', batchId: 'a', count: 2, sellCount: 0, nth: 2 },
      { key: '2026-11-05|b', date: '2026-11-05', batchId: 'b', count: 1, sellCount: 0, nth: 3 },
      { key: '2026-10-05|z', date: '2026-10-05', batchId: 'z', count: 1, sellCount: 1, nth: 1 },
    ]);
  });
});

describe('planDepositSubtractions', () => {
  it('sums deleted batch deposits per month and skips 0원 batches', () => {
    expect(planDepositSubtractions([
      { key: '2026-11-05|a', date: '2026-11-05', deposit: 500_000 },
      { key: '2026-10-05|null', date: '2026-10-05', deposit: 100_000 },
      { key: '2026-11-20|b', date: '2026-11-20', deposit: 200_000 },
      { key: '2026-11-21|c', date: '2026-11-21', deposit: 0 },
    ])).toEqual([
      { month: '2026-10', amount: 100_000, keys: ['2026-10-05|null'] },
      { month: '2026-11', amount: 700_000, keys: ['2026-11-05|a', '2026-11-20|b'] },
    ]);
    expect(planDepositSubtractions([])).toEqual([]);
  });
});

describe('planBudgetSubtraction', () => {
  it('takes from the first row, then the next, never below zero', () => {
    expect(planBudgetSubtraction([{ id: 'a', amount: 800_000 }], 500_000)).toEqual({
      updates: [{ id: 'a', amount: 300_000, take: 500_000 }], shortfall: 0,
    });
    expect(planBudgetSubtraction([{ id: 'a', amount: 200_000 }, { id: 'b', amount: 400_000 }], 500_000)).toEqual({
      updates: [{ id: 'a', amount: 0, take: 200_000 }, { id: 'b', amount: 100_000, take: 300_000 }], shortfall: 0,
    });
  });

  it('reports what it could not subtract and skips empty rows', () => {
    expect(planBudgetSubtraction([{ id: 'a', amount: 0 }, { id: 'b', amount: 100_000 }], 300_000)).toEqual({
      updates: [{ id: 'b', amount: 0, take: 100_000 }], shortfall: 200_000,
    });
    expect(planBudgetSubtraction([], 300_000)).toEqual({ updates: [], shortfall: 300_000 });
  });
});

describe('deleteBatchesWithDeposits', () => {
  const history = {
    records: [
      buy('b1', 450_000, 500_000),
      buy('b2', 20_000, 0), // 입금 없이 대기 현금으로 산 차수
      buy(null, 60_000, undefined, '2026-10-05'),
      buy(null, 40_000, undefined, '2026-10-05'),
    ],
    batchSummaries: [summary('b1', 500_000)],
  };
  const READ = 'select(id, month_date, amount)';
  const freshRows = (call: string) => {
    if (call.includes(READ) && call.includes('gte(month_date,2026-11-01)')) return [{ id: 'm11', month_date: '2026-11-05', amount: 800_000 }];
    if (call.includes(READ) && call.includes('gte(month_date,2026-10-01)')) return [{ id: 'm10', month_date: '2026-10-05', amount: 300_000 }];
    if (call.includes('.update(')) return [{ id: 'updated' }];
    return null;
  };
  const deletedIds = () => [{ id: 'r1' }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes records first, then subtracts only deposits of batches that really lost rows, reading the month fresh', async () => {
    const calls = mockSupabaseTables({}, { investment_records: deletedIds, monthly_budgets: freshRows });
    const outcome = await deleteBatchesWithDeposits(history, ['2026-11-05|b1', '2026-11-05|b2', '2026-10-05|null']);
    expect(calls).toEqual([
      'investment_records.delete().eq(date,2026-11-05).eq(batch_id,b1).select(id)',
      'batch_summaries.delete().eq(batch_id,b1)',
      'investment_records.delete().eq(date,2026-11-05).eq(batch_id,b2).select(id)',
      'batch_summaries.delete().eq(batch_id,b2)',
      'investment_records.delete().eq(date,2026-10-05).is(batch_id,null).select(id)',
      'monthly_budgets.select(id, month_date, amount).gte(month_date,2026-10-01).lt(month_date,2026-11-01).order(month_date)',
      'monthly_budgets.update({"amount":200000}).eq(id,m10).select(id)',
      'monthly_budgets.select(id, month_date, amount).gte(month_date,2026-11-01).lt(month_date,2026-12-01).order(month_date)',
      'monthly_budgets.update({"amount":300000}).eq(id,m11).select(id)',
    ]);
    expect(outcome.batches.map((b) => b.status)).toEqual(['deleted', 'deleted', 'deleted']);
    expect(outcome.months).toEqual([
      { month: '2026-10', amount: 100_000, keys: ['2026-10-05|null'], subtracted: 100_000, failed: false },
      { month: '2026-11', amount: 500_000, keys: ['2026-11-05|b1'], subtracted: 500_000, failed: false },
    ]);
  });

  it('never touches deposits of a batch whose delete failed or removed nothing — a retry cannot subtract twice', async () => {
    const calls = mockSupabaseTables(
      { investment_records: (call) => (call.includes('b1') ? 'offline' : null) },
      { investment_records: [], monthly_budgets: freshRows },
    );
    const outcome = await deleteBatchesWithDeposits(history, ['2026-11-05|b1', '2026-10-05|null']);
    expect(outcome.batches).toEqual([
      { key: '2026-11-05|b1', status: 'failed', summaryFailed: false },
      { key: '2026-10-05|null', status: 'empty', summaryFailed: false },
    ]);
    expect(outcome.months).toEqual([]);
    expect(calls.some((c) => c.startsWith('monthly_budgets') || c.startsWith('batch_summaries'))).toBe(false);
  });

  it('keeps going after one batch fails and subtracts for the batches that were deleted', async () => {
    mockSupabaseTables(
      { investment_records: (call) => (call.includes('2026-10-05') ? 'offline' : null) },
      { investment_records: deletedIds, monthly_budgets: freshRows },
    );
    const outcome = await deleteBatchesWithDeposits(history, ['2026-10-05|null', '2026-11-05|b1']);
    expect(outcome.batches.map((b) => b.status)).toEqual(['failed', 'deleted']);
    expect(outcome.months.map((m) => [m.month, m.subtracted])).toEqual([['2026-11', 500_000]]);
  });

  it('still subtracts when only the batch summary could not be deleted (the records are gone)', async () => {
    mockSupabaseTables({ batch_summaries: 'permission denied' }, { investment_records: deletedIds, monthly_budgets: freshRows });
    const outcome = await deleteBatchesWithDeposits(history, ['2026-11-05|b1']);
    expect(outcome.batches).toEqual([{ key: '2026-11-05|b1', status: 'deleted', summaryFailed: true }]);
    expect(outcome.months[0]).toMatchObject({ subtracted: 500_000, failed: false });
  });

  it('reports a month whose rows could not be read, or a row write that failed, with what was already subtracted', async () => {
    mockSupabaseTables(
      { monthly_budgets: (call) => (call.includes(READ) ? 'timeout' : null) },
      { investment_records: deletedIds },
    );
    const unread = await deleteBatchesWithDeposits(history, ['2026-11-05|b1']);
    expect(unread.months[0]).toMatchObject({ amount: 500_000, subtracted: 0, failed: true });

    const twoRows = (call: string) => (call.includes(READ)
      ? [{ id: 'm1', month_date: '2026-11-01', amount: 200_000 }, { id: 'm2', month_date: '2026-11-05', amount: 400_000 }]
      : [{ id: 'm1' }]);
    const calls = mockSupabaseTables(
      { monthly_budgets: (call) => (call.includes('eq(id,m2)') ? 'offline' : null) },
      { investment_records: deletedIds, monthly_budgets: twoRows },
    );
    const partial = await deleteBatchesWithDeposits(history, ['2026-11-05|b1']);
    expect(calls.filter((c) => c.includes('.update('))).toEqual([
      'monthly_budgets.update({"amount":0}).eq(id,m1).select(id)',
      'monthly_budgets.update({"amount":100000}).eq(id,m2).select(id)',
    ]);
    expect(partial.months[0]).toMatchObject({ subtracted: 200_000, failed: true });
  });

  it('treats an update that changed no row as a failure', async () => {
    mockSupabaseTables({}, {
      investment_records: deletedIds,
      monthly_budgets: (call) => (call.includes(READ) ? [{ id: 'gone', month_date: '2026-11-05', amount: 800_000 }] : []),
    });
    const outcome = await deleteBatchesWithDeposits(history, ['2026-11-05|b1']);
    expect(outcome.months[0]).toMatchObject({ subtracted: 0, failed: true });
  });
});

describe('describeDeleteOutcome', () => {
  const label = (key: string) => ({ '2026-11-05|b1': '2026-11-05 1차', '2026-11-05|b2': '2026-11-05 2차', '2026-10-05|null': '2026-10-05 1차' })[key] ?? key;
  const month = (m: string, amount: number, subtracted: number, failed = false) => ({ month: m, amount, keys: [], subtracted, failed });

  it('confirms a clean delete with the deposit taken out', () => {
    const outcome: DeleteOutcome = {
      batches: [{ key: '2026-11-05|b1', status: 'deleted', summaryFailed: false }, { key: '2026-11-05|b2', status: 'deleted', summaryFailed: false }],
      months: [month('2026-11', 500_000, 500_000)],
    };
    expect(describeDeleteOutcome(outcome, label)).toEqual({
      tone: 'success', message: '선택한 2개 차수를 삭제했습니다. 입금 기록에서 500,000원을 뺐습니다.',
    });
  });

  it('spells out a partial result batch by batch and month by month', () => {
    const outcome: DeleteOutcome = {
      batches: [
        { key: '2026-11-05|b1', status: 'deleted', summaryFailed: true },
        { key: '2026-10-05|null', status: 'failed', summaryFailed: false },
        { key: '2026-11-05|b2', status: 'empty', summaryFailed: false },
      ],
      months: [month('2026-11', 500_000, 0, true)],
    };
    const { tone, message } = describeDeleteOutcome(outcome, label);
    expect(tone).toBe('warning');
    expect(message.split('\n')).toEqual([
      '일부만 처리했습니다.',
      '삭제함: 2026-11-05 1차',
      '2026년 11월 입금 500,000원은 빼지 못했습니다 — 입금 기록에 그대로 남아 있습니다.',
      '삭제 못 함: 2026-10-05 1차 — 기록과 입금 모두 그대로입니다.',
      '이미 지워져 있음: 2026-11-05 2차 — 입금은 건드리지 않았습니다.',
      '차수 요약을 지우지 못함: 2026-11-05 1차 — 데이터 점검에 남은 요약이 보입니다.',
    ]);
  });

  it('explains a deposit that was only partly subtracted', () => {
    const deleted = [{ key: '2026-11-05|b1', status: 'deleted' as const, summaryFailed: false }];
    expect(describeDeleteOutcome({ batches: deleted, months: [month('2026-11', 500_000, 200_000, true)] }, label).message)
      .toContain('2026년 11월 입금에서 500,000원 중 200,000원만 뺐습니다 — 나머지는 입금 기록에 남아 있습니다.');
    expect(describeDeleteOutcome({ batches: deleted, months: [month('2026-11', 500_000, 300_000)] }, label).message)
      .toContain('2026년 11월 입금 기록이 모자라 500,000원 중 300,000원만 뺐습니다.');
  });

  it('says nothing changed when every delete failed, and when the records were already gone', () => {
    expect(describeDeleteOutcome({ batches: [{ key: '2026-11-05|b1', status: 'failed', summaryFailed: false }], months: [] }, label))
      .toEqual({ tone: 'error', message: '삭제하지 못했습니다. 기록과 입금은 그대로입니다 — 로그인 상태와 인터넷 연결을 확인해 주세요.' });
    const gone = describeDeleteOutcome({ batches: [{ key: '2026-11-05|b1', status: 'empty', summaryFailed: false }], months: [] }, label);
    expect(gone.tone).toBe('warning');
    expect(gone.message.split('\n')[0]).toBe('지울 기록이 이미 없었습니다.');
  });
});
