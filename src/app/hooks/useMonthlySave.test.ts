import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewBuyRecord } from '@/lib/monthly';
import { saveErrorMessage, writeMonth, type MonthWrite } from './useMonthlySave';
import { mockSupabaseTables } from './supabaseFake.test-util';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const record: NewBuyRecord = {
  date: '2026-11-05', asset_key: 'snp', price: 25_500, quantity: 13, amount: 331_500,
  is_panic_buy: false, batch_id: 'b1', batch_deposit: 500_000,
};

const write = (overrides: Partial<MonthWrite> = {}): MonthWrite => ({
  today: '2026-11-05',
  deposit: 500_000,
  records: [record],
  summary: { batch_id: 'b1', date: '2026-11-05', deposit: 500_000, total_spent: 331_500, remaining_cash: 168_500 },
  balance: 168_500,
  ...overrides,
});

const READ = 'monthly_budgets.select(id, month_date, amount).gte(month_date,2026-11-01).lt(month_date,2026-12-01).order(month_date)';

/** 이번 달 입금 행을 새로 읽으면 rows, 고치면 고친 행 1개 */
const budgetsWith = (rows: unknown[]) => (call: string) => (call.includes('.update(') ? [{ id: 'm11' }] : rows);

describe('writeMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds the deposit to this month\'s row as read fresh from the DB, then saves buys and side rows', async () => {
    // 화면에는 30만원으로 불러왔더라도 다른 기기에서 더해 40만원이 됐다면 40만원에 더한다
    const calls = mockSupabaseTables({}, { monthly_budgets: budgetsWith([{ id: 'm11', month_date: '2026-11-01', amount: 400_000 }]) });
    expect(await writeMonth(write())).toEqual({ ok: true, auxFailed: false });
    expect(calls).toEqual([
      READ,
      'monthly_budgets.update({"amount":900000}).eq(id,m11).select(id)',
      `investment_records.insert(${JSON.stringify([record])})`,
      'batch_summaries.upsert({"batch_id":"b1","date":"2026-11-05","deposit":500000,"total_spent":331500,"remaining_cash":168500})',
      'cash_balance_snapshots.upsert({"date":"2026-11-05","balance":168500})',
    ]);
  });

  it('inserts a new row when this month has none yet, and skips the deposit and summary when there is nothing to add', async () => {
    const calls = mockSupabaseTables({}, { monthly_budgets: budgetsWith([]) });
    expect(await writeMonth(write())).toEqual({ ok: true, auxFailed: false });
    expect(calls[1]).toBe('monthly_budgets.insert({"month_date":"2026-11-05","amount":500000})');

    const cashOnly = mockSupabaseTables();
    await writeMonth(write({ deposit: 0 }));
    expect(cashOnly.some((c) => c.startsWith('monthly_budgets'))).toBe(false);

    const depositOnly = mockSupabaseTables({}, { monthly_budgets: budgetsWith([]) });
    await writeMonth(write({ records: [], summary: null }));
    expect(depositOnly.map((c) => c.split('.')[0])).toEqual(['monthly_budgets', 'monthly_budgets', 'cash_balance_snapshots']);
  });

  it('saves nothing when this month cannot be read first', async () => {
    const calls = mockSupabaseTables({ monthly_budgets: 'offline' });
    expect(await writeMonth(write())).toEqual({ ok: false, step: '입금', savedSomething: false });
    expect(calls).toEqual([READ]);
  });

  it('fails the deposit step when the row it read is gone by the time it writes', async () => {
    mockSupabaseTables({}, { monthly_budgets: (call) => (call.includes('.update(') ? [] : [{ id: 'm11', amount: 1 }]) });
    expect(await writeMonth(write())).toEqual({ ok: false, step: '입금', savedSomething: false });
  });

  it('reports a saved deposit when the buys fail', async () => {
    const calls = mockSupabaseTables({ investment_records: 'offline' }, { monthly_budgets: budgetsWith([]) });
    expect(await writeMonth(write())).toEqual({ ok: false, step: '매수 기록', savedSomething: true });
    expect(calls.some((c) => c.startsWith('batch_summaries') || c.startsWith('cash_balance_snapshots'))).toBe(false);
  });

  it('treats the summary and the cash snapshot as best-effort', async () => {
    const calls = mockSupabaseTables({ batch_summaries: 'denied', cash_balance_snapshots: 'denied' }, { monthly_budgets: budgetsWith([]) });
    expect(await writeMonth(write())).toEqual({ ok: true, auxFailed: true });
    // 요약이 실패해도 스냅샷은 시도한다
    expect(calls.at(-1)).toMatch(/^cash_balance_snapshots\.upsert/);
  });
});

describe('saveErrorMessage', () => {
  it('tells whether anything was saved and what to retry', () => {
    expect(saveErrorMessage('입금', false, 500_000)).toContain('아무것도 기록되지 않았습니다');
    expect(saveErrorMessage('매수 기록', true, 500_000))
      .toBe('입금 500,000원은 저장했지만 매수 기록은 저장하지 못했습니다. 입금은 다시 넣지 말고 매수만 다시 기록해 주세요.');
  });
});
