import { describe, expect, it } from 'vitest';
import type { DividendRecord, InvestmentRecord, MonthlyBudget } from './types';
import {
  calculatePositions, calculateRealizedPnl, calculateXirr,
  getCashBalanceOnDate, getCumulativeInterestByMonths, getInterestAccruedInMonth,
  getInterestFromMonthStartToToday, formatSignedPercent, planCoreBuys, sellablePositionOn,
} from './utils';

const buy = (
  date: string, assetKey: string, price: number, quantity: number, extra: Partial<InvestmentRecord> = {},
): InvestmentRecord => ({ date, asset_key: assetKey, price, quantity, amount: price * quantity, type: 'buy', ...extra });

const sell = (date: string, assetKey: string, price: number, quantity: number): InvestmentRecord => ({
  date, asset_key: assetKey, price, quantity, amount: price * quantity, type: 'sell',
});

const div = (date: string, assetKey: string, amount: number): DividendRecord => ({
  date, asset_key: assetKey, amount, is_reinvested: false,
});

const budget = (monthDate: string, amount: number): MonthlyBudget => ({ month_date: monthDate, amount });

describe('getCashBalanceOnDate', () => {
  const budgets = [budget('2026-01-05', 1_000_000), budget('2026-02-05', 1_000_000)];
  const records = [buy('2026-01-05', 'snp', 25_000, 30), sell('2026-01-20', 'snp', 26_000, 10)];
  const dividends = [div('2026-01-15', 'snp', 5_000), div('2026-02-15', 'snp', 7_000)];

  it('adds deposits and sell proceeds, subtracts buys', () => {
    expect(getCashBalanceOnDate('2026-01-04', budgets, records)).toBe(0);
    expect(getCashBalanceOnDate('2026-01-05', budgets, records)).toBe(250_000);
    expect(getCashBalanceOnDate('2026-01-31', budgets, records)).toBe(510_000);
  });

  it('adds dividends paid on or before the day', () => {
    expect(getCashBalanceOnDate('2026-01-14', budgets, records, dividends)).toBe(250_000);
    expect(getCashBalanceOnDate('2026-01-15', budgets, records, dividends)).toBe(255_000);
    expect(getCashBalanceOnDate('2026-02-28', budgets, records, dividends)).toBe(2_000_000 - 750_000 + 260_000 + 12_000);
  });

  it('uses amount_override and never goes below zero', () => {
    const overridden = [buy('2026-01-05', 'snp', 25_000, 30, { amount_override: 800_000 })];
    expect(getCashBalanceOnDate('2026-01-05', budgets, overridden)).toBe(200_000);
    const overspent = [buy('2026-01-05', 'snp', 25_000, 100)];
    expect(getCashBalanceOnDate('2026-01-05', budgets, overspent)).toBe(0);
  });
});

describe('CMA interest with dividends', () => {
  // 잔액 365,000원 × 연 10% → 하루 100원
  const rate = 10;

  it('accrues interest on dividend cash from its pay date', () => {
    expect(getInterestAccruedInMonth('2026-04', [], [], rate)).toBe(0);
    expect(getInterestAccruedInMonth('2026-04', [], [], rate, [div('2026-04-01', 'snp', 365_000)])).toBeCloseTo(3000);
    expect(getInterestAccruedInMonth('2026-04', [], [], rate, [div('2026-04-16', 'snp', 365_000)])).toBeCloseTo(1500);
    expect(getInterestAccruedInMonth('bad', [], [], rate)).toBe(0);
  });

  it('accumulates month by month', () => {
    const cum = getCumulativeInterestByMonths(
      ['2026-03', '2026-04'], [budget('2026-03-01', 365_000)], [], rate, [div('2026-04-01', 'snp', 365_000)],
    );
    expect(cum[0]).toBeCloseTo(3100);
    expect(cum[1]).toBeCloseTo(3100 + 6000);
  });

  it('counts this month up to today in KST', () => {
    const budgets = [budget('2026-02-01', 365_000)];
    // 2026-02-28 23:30 UTC = 2026-03-01 08:30 KST → 3월 1일 하루치만
    const at = new Date('2026-02-28T23:30:00Z');
    expect(getInterestFromMonthStartToToday(budgets, [], rate, [], at)).toBeCloseTo(100);
    expect(getInterestFromMonthStartToToday(budgets, [], rate, [div('2026-03-01', 'snp', 365_000)], at)).toBeCloseTo(200);
    const nov5 = new Date('2026-11-05T03:00:00Z');
    expect(getInterestFromMonthStartToToday([budget('2026-11-03', 365_000)], [], rate, [], nov5)).toBeCloseTo(300);
  });
});

describe('calculateRealizedPnl', () => {
  const records = [
    buy('2025-01-10', 'snp', 100, 10),
    buy('2025-02-10', 'snp', 200, 10), // 평균 150
    sell('2025-06-10', 'snp', 180, 5), // +150
    sell('2026-03-10', 'snp', 120, 5), // -150
  ];

  it('uses the average buy cost', () => {
    expect(calculateRealizedPnl(records)).toEqual({ snp: 0 });
    expect(calculateRealizedPnl(records, 2025)).toEqual({ snp: 150 });
    expect(calculateRealizedPnl(records, 2026)).toEqual({ snp: -150 });
    expect(calculateRealizedPnl(records, 2024)).toEqual({});
  });

  it('honours amount_override and BTC override quantity', () => {
    const withFee = [buy('2025-01-10', 'nasdaq', 100, 10, { amount_override: 1100 }), sell('2025-05-01', 'nasdaq', 120, 10)];
    expect(calculateRealizedPnl(withFee).nasdaq).toBeCloseTo(100);

    // 비트코인: amount_override / price 가 실제 수량 (0.01 BTC, 평단 1억)
    const btc = [
      buy('2025-01-10', 'btc', 100_000_000, 0.0099, { amount: 990_000, amount_override: 1_000_000 }),
      sell('2025-05-01', 'btc', 120_000_000, 0.005),
    ];
    expect(calculateRealizedPnl(btc).btc).toBeCloseTo(100_000);
  });

  it('treats a sell without buys as all gain', () => {
    expect(calculateRealizedPnl([sell('2025-05-01', 'gold', 100, 3)])).toEqual({ gold: 300 });
  });
});

describe('moving-average cost basis', () => {
  const base = [
    buy('2025-01-10', 'tech10', 100, 10),
    buy('2025-02-10', 'tech10', 200, 10), // 평균 150
    sell('2025-03-10', 'tech10', 300, 5), // 실현 750, 15주 @150
  ];

  it('keeps the average cost after a partial sell', () => {
    expect(calculateRealizedPnl(base)).toEqual({ tech10: 750 });
    expect(calculatePositions(base).tech10).toEqual({ qty: 15, cost: 2250, avgCost: 150 });
  });

  it('blends a later buy into the remaining average', () => {
    const records = [...base, buy('2025-04-10', 'tech10', 110, 5)];
    expect(calculatePositions(records).tech10).toEqual({ qty: 20, cost: 2800, avgCost: 140 });
    // 이후 매도는 새 평균 140 기준
    const sold = [...records, sell('2025-05-10', 'tech10', 150, 20)];
    expect(calculateRealizedPnl(sold)).toEqual({ tech10: 750 + 200 });
    expect(calculateRealizedPnl(sold, 2025)).toEqual({ tech10: 950 });
  });

  it('resets the basis after a full exit', () => {
    const records = [
      buy('2025-01-10', 'gold', 100, 10),
      sell('2025-02-10', 'gold', 120, 10), // +200, 전량 매도
      buy('2025-03-10', 'gold', 200, 10),
      sell('2025-04-10', 'gold', 210, 5), // 새 평균 200 기준 +50
    ];
    expect(calculateRealizedPnl(records)).toEqual({ gold: 250 });
    expect(calculatePositions(records).gold).toEqual({ qty: 5, cost: 1000, avgCost: 200 });
    expect(calculatePositions(records.slice(0, 2)).gold).toEqual({ qty: 0, cost: 0, avgCost: 0 });
  });

  it('processes each asset in date order, buys before sells on the same day', () => {
    const shuffled = [
      sell('2025-03-10', 'tech10', 300, 5),
      buy('2025-02-10', 'tech10', 200, 10),
      buy('2025-01-10', 'tech10', 100, 10),
      sell('2025-06-01', 'snp', 120, 10),
      buy('2025-06-01', 'snp', 100, 10),
    ];
    expect(calculateRealizedPnl(shuffled)).toEqual({ tech10: 750, snp: 200 });
    expect(calculatePositions(shuffled)).toEqual({
      tech10: { qty: 15, cost: 2250, avgCost: 150 },
      snp: { qty: 0, cost: 0, avgCost: 0 },
    });
  });

  it('attributes realized P&L to the sell year using the average at that time', () => {
    const records = [
      buy('2025-01-10', 'nasdaq', 100, 10),
      sell('2025-12-10', 'nasdaq', 150, 5), // +250 (2025)
      buy('2026-01-10', 'nasdaq', 250, 5), // 평균 (500 + 1250) / 10 = 175
      sell('2026-06-10', 'nasdaq', 200, 10), // +250 (2026)
    ];
    expect(calculateRealizedPnl(records, 2025)).toEqual({ nasdaq: 250 });
    expect(calculateRealizedPnl(records, 2026)).toEqual({ nasdaq: 250 });
    expect(calculateRealizedPnl(records)).toEqual({ nasdaq: 500 });
  });

  it('uses the effective BTC quantity and amount', () => {
    const records = [
      buy('2025-01-10', 'btc', 100_000_000, 0.0099, { amount: 990_000, amount_override: 1_000_000 }),
      sell('2025-05-01', 'btc', 120_000_000, 0.004),
    ];
    const btc = calculatePositions(records).btc;
    expect(btc.qty).toBeCloseTo(0.006);
    expect(btc.avgCost).toBeCloseTo(100_000_000);
    expect(btc.cost).toBeCloseTo(600_000);
  });
});

describe('calculateXirr', () => {
  it('returns the annual rate of a single deposit', () => {
    const rate = calculateXirr([
      { date: '2025-01-01', amount: -1000 },
      { date: '2026-01-01', amount: 1100 },
    ]);
    expect(rate).toBeCloseTo(0.1, 3);
    const loss = calculateXirr([
      { date: '2026-01-01', amount: 900 },
      { date: '2025-01-01', amount: -1000 },
    ]);
    expect(loss).toBeCloseTo(-0.1, 3);
  });

  it('solves monthly deposits so that NPV is zero', () => {
    const flows = [
      { date: '2025-01-01', amount: -100 },
      { date: '2025-04-01', amount: -100 },
      { date: '2025-07-01', amount: -100 },
      { date: '2025-10-01', amount: -100 },
      { date: '2026-01-01', amount: 450 },
    ];
    const rate = calculateXirr(flows);
    expect(rate).not.toBeNull();
    const t0 = new Date(flows[0].date).getTime();
    const npv = flows.reduce(
      (s, f) => s + f.amount / Math.pow(1 + (rate as number), (new Date(f.date).getTime() - t0) / (365.25 * 86_400_000)),
      0,
    );
    expect(Math.abs(npv)).toBeLessThan(1e-4);
    expect(rate as number).toBeGreaterThan(0);
  });

  it('returns null when there is no solution', () => {
    expect(calculateXirr([{ date: '2025-01-01', amount: -1000 }])).toBeNull();
    expect(calculateXirr([{ date: '2025-01-01', amount: -1 }, { date: '2025-02-01', amount: -1 }])).toBeNull();
    expect(calculateXirr([{ date: '2025-01-01', amount: 1 }, { date: '2025-02-01', amount: 1 }])).toBeNull();
    expect(calculateXirr([{ date: '2025-01-01', amount: -1000 }, { date: '2025-01-02', amount: 1 }])).toBeNull();
  });
});

describe('sellablePositionOn', () => {
  const records = [
    buy('2025-01-10', 'tech10', 100, 10),
    buy('2025-03-10', 'tech10', 200, 10), // 평균 150
    sell('2025-05-10', 'tech10', 300, 8), // 12주 남음
    buy('2025-06-10', 'gold', 50, 4),
  ];

  it('uses the holding and moving-average cost as of the sell date', () => {
    expect(sellablePositionOn(records, 'tech10', '2025-02-01')).toEqual({ qty: 10, avgCost: 100 });
    expect(sellablePositionOn(records, 'tech10', '2025-12-31')).toEqual({ qty: 12, avgCost: 150 });
    // 매수 전 날짜에는 팔 것이 없다
    expect(sellablePositionOn(records, 'gold', '2025-06-09')).toEqual({ qty: 0, avgCost: 0 });
    expect(sellablePositionOn(records, 'gold', '2025-06-10')).toEqual({ qty: 4, avgCost: 50 });
  });

  it('never lets a backdated sell push a later holding below zero', () => {
    // 4월 기준 20주 보유지만 5월에 8주를 팔았으므로 오늘 남은 12주까지만 팔 수 있다
    expect(sellablePositionOn(records, 'tech10', '2025-04-01')).toEqual({ qty: 12, avgCost: 150 });
    // 전량 매도한 뒤에는 그 전 날짜로도 팔 수 없다
    const exited = [...records, sell('2025-07-01', 'tech10', 300, 12)];
    expect(sellablePositionOn(exited, 'tech10', '2025-04-01').qty).toBe(0);
  });

  it('counts sells already recorded on the same day', () => {
    const sameDay = [buy('2025-01-10', 'snp', 100, 10), sell('2025-01-10', 'snp', 110, 4)];
    expect(sellablePositionOn(sameDay, 'snp', '2025-01-10')).toEqual({ qty: 6, avgCost: 100 });
    expect(sellablePositionOn(sameDay, 'snp', '2025-01-09').qty).toBe(0);
  });

  it('handles BTC fractional quantities with an amount override', () => {
    const btc = [buy('2025-01-10', 'btc', 100_000_000, 0.0099, { amount: 990_000, amount_override: 1_000_000 })];
    expect(sellablePositionOn(btc, 'btc', '2025-02-01').qty).toBeCloseTo(0.01);
  });
});

describe('formatSignedPercent', () => {
  it('adds a sign and a Unicode minus', () => {
    expect(formatSignedPercent(12.345)).toBe('+12.3%');
    expect(formatSignedPercent(-4.56)).toBe('−4.6%');
    expect(formatSignedPercent(2.43, 1, '%p')).toBe('+2.4%p');
    expect(formatSignedPercent(7, 0)).toBe('+7%');
  });

  it('drops the sign when the rounded value is zero or invalid', () => {
    expect(formatSignedPercent(0)).toBe('0.0%');
    expect(formatSignedPercent(-0.04)).toBe('0.0%');
    expect(formatSignedPercent(Number.NaN)).toBe('0.0%');
  });
});

describe('utils re-exports', () => {
  it('exposes the core buy planner', () => {
    expect(typeof planCoreBuys).toBe('function');
  });
});
