import { describe, expect, it } from 'vitest';
import type { DividendRecord, InvestmentRecord, MarketDataPoint, MonthlyBudget } from '@/lib/types';
import { buildMyAccount } from './useMyAccount';

const record = (
  type: 'buy' | 'sell', date: string, assetKey: string, price: number, quantity: number,
): InvestmentRecord => ({ date, asset_key: assetKey, price, quantity, amount: price * quantity, type });

const div = (date: string, assetKey: string, amount: number): DividendRecord => ({
  date, asset_key: assetKey, amount, is_reinvested: false,
});

const budget = (monthDate: string, amount: number): MonthlyBudget => ({ month_date: monthDate, amount });

const market: MarketDataPoint[] = [
  { d: '2026-01', snp: 25_000, ex: 1400 },
  { d: '2026-02', snp: 26_000, ex: 1400 },
];
// 2026-02-25 12:00 KST
const now = new Date('2026-02-25T03:00:00Z');

describe('buildMyAccount', () => {
  const dbHistory = {
    budgets: [budget('2026-01-05', 1_000_000)],
    records: [record('buy', '2026-01-05', 'snp', 25_000, 30), record('sell', '2026-02-20', 'snp', 26_000, 10)],
    dividends: [div('2026-02-15', 'snp', 5_000)],
  };
  const build = (livePrices: Record<string, number> | null = null) =>
    buildMyAccount({ marketData: market, livePrices, dbHistory, cmaRate: 0, now });

  it('counts sell proceeds and dividends as cash', () => {
    const acc = build();
    expect(acc?.currentCashBalance).toBe(1_000_000 - 750_000 + 260_000 + 5_000);
    expect(acc?.totalInvested).toBe(1_000_000);
  });

  it('values holdings at the moving-average cost after a partial sell', () => {
    const acc = build({ snp: 30_000, ex: 1400 });
    expect(acc?.portfolio.snp).toEqual({ qty: 20, avg: 25_000, cost: 500_000, val: 600_000 });
    expect(acc?.totalAsset).toBe(600_000 + 515_000);
  });

  it('replays sells and dividends month by month in the chart', () => {
    const [jan, feb] = build()?.chartHistory ?? [];
    expect(jan).toMatchObject({ date: '2026-01', principal: 1_000_000, cash: 250_000, value_snp: 750_000, principal_snp: 750_000 });
    expect(jan.investment).toBe(1_000_000);
    // 2월: 매도 대금 +260,000, 배당 +5,000, 보유 20주
    expect(feb).toMatchObject({ date: '2026-02', cash: 515_000, value_snp: 520_000, principal_snp: 500_000 });
    expect(feb.investment).toBe(1_035_000);
  });

  it('uses live prices for the last chart point', () => {
    const acc = build({ snp: 30_000, ex: 1400 });
    expect(acc?.chartHistory[1].investment).toBe(acc?.totalAsset);
    expect(acc?.chartHistory[1].principal).toBe(acc?.totalInvested);
    expect(acc?.chartHistory[0].investment).toBe(1_000_000);
    expect(acc?.currentExchangeRate).toBe(1400);
  });

  it('puts a deposit made before the month\'s first trading day into the last point\'s principal', () => {
    // 3월 1일(일) 입금 — 3월 월봉은 아직 없다
    const acc = buildMyAccount({
      marketData: market,
      livePrices: { snp: 26_000, ex: 1400 },
      dbHistory: { ...dbHistory, budgets: [...dbHistory.budgets, budget('2026-03-01', 500_000)] },
      cmaRate: 0,
      now: new Date('2026-03-01T03:00:00Z'),
    });
    const last = acc?.chartHistory[acc.chartHistory.length - 1];
    expect(acc?.totalInvested).toBe(1_500_000);
    expect(last).toMatchObject({ date: '2026-02', principal: 1_500_000, investment: acc?.totalAsset });
    // 입금 50만원은 현금으로 총자산에도 들어가 있다 — 원금과 같이 늘어 수익으로 보이지 않는다
    expect((acc?.totalAsset ?? 0) - 1_500_000).toBe(1_035_000 - 1_000_000);
    // 지난 달 점은 그대로
    expect(acc?.chartHistory[0].principal).toBe(1_000_000);
  });

  it('accrues CMA interest on dividend cash', () => {
    const acc = buildMyAccount({
      marketData: market,
      livePrices: null,
      dbHistory: { budgets: [], records: [], dividends: [div('2026-02-01', 'snp', 365_000)] },
      cmaRate: 10,
      now,
    });
    // 365,000원 × 연 10% → 하루 100원, 2월 1일~25일
    expect(acc?.cumulativeCmaInterestToToday).toBeCloseTo(2_500);
  });

  it('returns null without market data', () => {
    expect(buildMyAccount({ marketData: [], livePrices: null, dbHistory, cmaRate: 0, now })).toBeNull();
  });
});
