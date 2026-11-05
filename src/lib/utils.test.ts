import { describe, expect, it } from 'vitest';
import type { DividendRecord, InvestmentRecord, MonthlyBudget } from './types';
import {
  BENCHMARKS, buildFlowAdjustedIndex, calculateBenchmarkComparison, calculateIsaProjection,
  calculateMDD, calculatePositions, calculateRealizedPnl, calculateTaxSimulation, calculateXirr,
  getCashBalanceOnDate, getCumulativeInterestByMonths, getInterestAccruedInMonth,
  getInterestFromMonthStartToToday, planCoreBuys,
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

  it('values the ISA projection at the moving average', () => {
    const records = [
      buy('2025-01-10', 'snp', 100, 10),
      sell('2025-02-10', 'snp', 150, 10), // 실현 +500, 전량 매도
      buy('2025-03-10', 'snp', 200, 10), // 새 평균 200
    ];
    const p = calculateIsaProjection(records, [], { snp: 260 });
    expect(p.realizedTaxable).toBe(500);
    expect(p.unrealizedTaxable).toBe(600);
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

describe('buildFlowAdjustedIndex + calculateMDD', () => {
  it('reveals a loss hidden by a same-month deposit', () => {
    const points = [{ principal: 100, investment: 100 }, { principal: 200, investment: 180 }];
    expect(calculateMDD(points.map((p) => p.investment)).mdd).toBe(0);
    const index = buildFlowAdjustedIndex(points);
    expect(index[0]).toBe(1);
    expect(index[1]).toBeCloseTo(0.8);
    expect(calculateMDD(index).mdd).toBeCloseTo(20);
  });

  it('chains monthly returns and locates peak and trough', () => {
    const index = buildFlowAdjustedIndex([
      { principal: 100, investment: 100 },
      { principal: 200, investment: 210 },
      { principal: 200, investment: 189 },
    ]);
    expect(index[1]).toBeCloseTo(1.1);
    expect(index[2]).toBeCloseTo(0.99);
    const result = calculateMDD(index);
    expect(result.mdd).toBeCloseTo(10);
    expect(result.peakIdx).toBe(1);
    expect(result.troughIdx).toBe(2);
  });

  it('skips months that start from zero and handles empty input', () => {
    expect(buildFlowAdjustedIndex([{ principal: 0, investment: 0 }, { principal: 100, investment: 100 }])).toEqual([1, 1]);
    expect(calculateMDD([])).toEqual({ mdd: 0, peakIdx: 0, troughIdx: 0 });
  });
});

describe('calculateTaxSimulation (ISA cumulative)', () => {
  const records = [
    buy('2025-01-10', 'snp', 20_000, 100),
    sell('2025-12-10', 'snp', 80_000, 50), // +3,000,000 (2025)
    buy('2025-02-10', 'nasdaq', 30_000, 100),
    sell('2026-03-10', 'nasdaq', 20_000, 100), // -1,000,000 (2026)
    buy('2025-03-10', 'gold', 50_000, 10),
    sell('2026-04-10', 'gold', 120_000, 10), // +700,000 (2026)
    buy('2025-01-10', 'samsung', 50_000, 100),
    sell('2026-05-10', 'samsung', 100_000, 100), // +5,000,000 국내주식 → 제외
  ];
  const dividends = [
    div('2025-04-15', 'snp', 1_500_000),
    div('2026-04-15', 'samsung', 500_000),
    div('2026-04-15', 'btc', 100_000), // ISA 밖 → 제외
    div('2026-04-15', 'unknown', 100), // 미등록 자산 → 제외
  ];

  it('nets foreign/gold ETF P&L over all years and adds distributions', () => {
    const tax = calculateTaxSimulation(records, dividends);
    expect(tax.isaNetGain).toBe(2_700_000);
    expect(tax.isaDividend).toBe(2_000_000);
    expect(tax.isaTotalProfit).toBe(4_700_000);
    expect(tax.isaTaxFreeLimit).toBe(4_000_000);
    expect(tax.isaTaxFreeAmount).toBe(4_000_000);
    expect(tax.isaTaxableAmount).toBe(700_000);
    expect(tax.isaTax).toBe(69_300);
    expect(tax.isaTaxFreeRemaining).toBe(0);
    // 일반계좌: 이익만 15.4% (3,000,000 + 700,000 + 배당 2,000,000)
    expect(tax.isaSavings).toBe(877_800 - 69_300);
    expect(tax.btcGain).toBe(0);
    expect(tax.totalEstimatedTax).toBe(69_300);
  });

  it('can still look at a single year', () => {
    const y2025 = calculateTaxSimulation(records, dividends, 2025);
    expect(y2025.isaNetGain).toBe(3_000_000);
    expect(y2025.isaDividend).toBe(1_500_000);
    expect(y2025.isaTax).toBe(49_500);

    const y2026 = calculateTaxSimulation(records, dividends, 2026);
    expect(y2026.isaNetGain).toBe(-300_000);
    expect(y2026.isaTotalProfit).toBe(200_000);
    expect(y2026.isaTax).toBe(0);
    expect(y2026.isaTaxFreeRemaining).toBe(3_800_000);
  });

  it('does not offset domestic equity losses', () => {
    const tax = calculateTaxSimulation([
      buy('2025-01-10', 'snp', 10_000, 100), sell('2025-06-10', 'snp', 20_000, 100), // +1,000,000
      buy('2025-01-10', 'kodex200', 40_000, 100), sell('2025-06-10', 'kodex200', 20_000, 100), // -2,000,000
    ], []);
    expect(tax.isaNetGain).toBe(1_000_000);
    expect(tax.isaTotalProfit).toBe(1_000_000);
  });

  it('lets ETF losses offset distributions', () => {
    const tax = calculateTaxSimulation(
      [buy('2025-01-10', 'nasdaq', 30_000, 100), sell('2025-06-10', 'nasdaq', 20_000, 100)],
      [div('2025-07-01', 'snp', 300_000)],
    );
    expect(tax.isaNetGain).toBe(-1_000_000);
    expect(tax.isaTotalProfit).toBe(0);
    expect(tax.isaTax).toBe(0);
    expect(tax.isaTaxFreeRemaining).toBe(4_000_000);
  });

  it('uses the 일반형 limit', () => {
    const tax = calculateTaxSimulation(records, dividends, undefined, 'general');
    expect(tax.isaTaxFreeLimit).toBe(2_000_000);
    expect(tax.isaTaxableAmount).toBe(2_700_000);
    expect(tax.isaTax).toBe(267_300);
  });

  it('taxes crypto per year from 2027 with the 2.5M deduction', () => {
    const btc = [
      buy('2025-01-01', 'btc', 100_000_000, 0.1),
      sell('2026-06-01', 'btc', 200_000_000, 0.03), // +3,000,000 (2026, 비과세)
      sell('2027-06-01', 'btc', 200_000_000, 0.04), // +4,000,000 (2027, 과세표준 1,500,000)
      sell('2028-06-01', 'btc', 50_000_000, 0.03), // -1,500,000 (2028)
    ];
    const all = calculateTaxSimulation(btc, []);
    expect(all.btcGain).toBeCloseTo(7_000_000);
    expect(all.btcTaxBase).toBeCloseTo(1_500_000);
    expect(all.btcTax).toBe(330_000);
    expect(all.totalEstimatedTax).toBe(330_000);

    expect(calculateTaxSimulation(btc, [], 2026).btcTax).toBe(0);
    const y2027 = calculateTaxSimulation(btc, [], 2027);
    expect(y2027.btcGain).toBeCloseTo(4_000_000);
    expect(y2027.btcTax).toBe(330_000);
    expect(calculateTaxSimulation(btc, [], 2028).btcGain).toBe(0);
  });
});

describe('calculateIsaProjection', () => {
  const records = [
    buy('2025-01-10', 'snp', 20_000, 10),
    buy('2025-06-10', 'snp', 30_000, 10), // 평단 25,000
    sell('2026-01-10', 'snp', 35_000, 5), // 실현 +50,000, 보유 15주
    buy('2025-01-10', 'samsung', 50_000, 10), // 국내주식 → 제외
    buy('2025-01-10', 'nasdaq_kodex', 25_000, 10), // 현재가 없음 → 제외
    buy('2025-01-10', 'gold', 100_000, 10), // 평가손 -100,000
  ];
  const dividends = [div('2025-12-20', 'snp', 10_000)];
  const live = { snp: 40_000, samsung: 100_000, nasdaq_kodex: 0, gold: 90_000 };

  it('adds unrealized ETF gains to realized gains and distributions', () => {
    const p = calculateIsaProjection(records, dividends, live);
    expect(p.realizedTaxable).toBe(60_000);
    expect(p.unrealizedTaxable).toBe(225_000 - 100_000);
    expect(p.totalTaxable).toBe(185_000);
    expect(p.taxFreeLimit).toBe(4_000_000);
    expect(p.taxFreeRemaining).toBe(3_815_000);
    expect(p.estimatedTaxIfRealizedNow).toBe(0);
  });

  it('is consistent with realized P&L (average cost)', () => {
    const p = calculateIsaProjection(records.slice(0, 3), [], { snp: 40_000 });
    // 실현 + 미실현 = 매도대금 + 보유평가 − 총매수
    expect(p.realizedTaxable + p.unrealizedTaxable).toBe(175_000 + 40_000 * 15 - 500_000);
  });

  it('estimates tax above the limit', () => {
    const big = [buy('2025-01-10', 'snp', 20_000, 100)];
    const common = calculateIsaProjection(big, [], { snp: 70_000 });
    expect(common.unrealizedTaxable).toBe(5_000_000);
    expect(common.taxFreeRemaining).toBe(0);
    expect(common.estimatedTaxIfRealizedNow).toBe(99_000);
    expect(calculateIsaProjection(big, [], { snp: 70_000 }, 'general').estimatedTaxIfRealizedNow).toBe(297_000);
  });

  it('lets unrealized losses offset realized gains', () => {
    const p = calculateIsaProjection([
      buy('2025-01-10', 'snp', 10_000, 100), sell('2025-06-10', 'snp', 20_000, 100), // 실현 +1,000,000, 전량 매도
      buy('2025-01-10', 'nasdaq', 30_000, 100), // 평가손 -1,500,000
    ], [], { snp: 99_999, nasdaq: 15_000 });
    expect(p.realizedTaxable).toBe(1_000_000);
    expect(p.unrealizedTaxable).toBe(-1_500_000);
    expect(p.totalTaxable).toBe(0);
    expect(p.taxFreeRemaining).toBe(4_000_000);
  });
});

describe('calculateBenchmarkComparison', () => {
  const chart = [
    { date: '2026-01', principal: 1000, investment: 1000 },
    { date: '2026-02', principal: 1000, investment: 1080 },
    { date: '2026-03', principal: 2000, investment: 2150 },
  ];
  const market = [
    { d: '2026-01', snp: 100, nasdaq: 50 },
    { d: '2026-02', snp: 110, nasdaq: 60 },
    { d: '2026-03', snp: 121, nasdaq: 75 },
  ];
  const live = { snp: 121, nasdaq: 75 };
  const midMarchKst = new Date('2026-03-15T03:00:00Z');
  const valuesAt = (points: Record<string, unknown>[], date: string) => points.find((p) => p.date === date);

  it('compares against S&P500 only and S&P500 70 / Nasdaq-100 30', () => {
    expect(BENCHMARKS.map((b) => [b.key, b.label])).toEqual([
      ['bm_snp', 'S&P500만'],
      ['bm_7030', 'S&P500 70 / 나스닥100 30'],
    ]);
  });

  it('buys each deposit at that month price', () => {
    const { points, results } = calculateBenchmarkComparison([], chart, market, live, midMarchKst);
    expect(points.map((p) => p.date)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(valuesAt(points, '2026-02')).toMatchObject({ myPortfolio: 1080, principal: 1000, bm_snp: 1100, bm_7030: 1130 });
    const march = valuesAt(points, '2026-03') as Record<string, number>;
    expect(march.bm_snp).toBeCloseTo(2210);
    expect(march.bm_7030).toBeCloseTo(1547 + 750);
    expect(march.myPortfolio).toBe(2150);
    expect(results.map((r) => r.key)).toEqual(['bm_7030', 'bm_snp', 'myPortfolio']);
    expect(results[2].totalReturn).toBeCloseTo(7.5);
  });

  it('holds money as cash until the benchmark asset has a price', () => {
    const missingJanNasdaq = [{ d: '2026-01', snp: 100 }, { d: '2026-02', snp: 110, nasdaq: 60 }];
    const { points } = calculateBenchmarkComparison([], chart.slice(0, 2), missingJanNasdaq, live, midMarchKst);
    expect(valuesAt(points, '2026-01')?.bm_7030).toBeCloseTo(700 + 300); // 나스닥 몫 300은 현금 대기
    expect(valuesAt(points, '2026-02')?.bm_7030).toBeCloseTo(7 * 110 + (300 / 60) * 60);
  });

  it('values holdings at the last valid price when a month is missing', () => {
    const gap = [{ d: '2026-01', snp: 100, nasdaq: 50 }, { d: '2026-02', snp: 0, nasdaq: 60 }];
    const { points } = calculateBenchmarkComparison([], chart.slice(0, 2), gap, live, midMarchKst);
    expect(valuesAt(points, '2026-02')?.bm_snp).toBe(1000);
  });

  it('buys deposits after the last history month at live prices', () => {
    const { points } = calculateBenchmarkComparison([], chart, market.slice(0, 2), live, midMarchKst);
    expect(points.map((p) => p.date)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect((valuesAt(points, '2026-03') as Record<string, number>).bm_snp).toBeCloseTo(2210);
  });

  it('decides the current month in KST', () => {
    // 2026-02-28 23:30 UTC = 3월 1일 KST → 2월 포인트를 덮어쓰지 않고 3월 포인트 추가
    const { points } = calculateBenchmarkComparison(
      [], chart.slice(0, 2), market.slice(0, 2), live, new Date('2026-02-28T23:30:00Z'),
    );
    expect(points.map((p) => p.date)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(valuesAt(points, '2026-02')?.bm_snp).toBe(1100);
    expect(valuesAt(points, '2026-03')?.bm_snp).toBeCloseTo(10 * 121);
  });

  it('falls back to the last history price when a live price is missing', () => {
    const { points } = calculateBenchmarkComparison([], chart.slice(0, 2), market.slice(0, 2), { snp: 121 }, midMarchKst);
    expect(valuesAt(points, '2026-03')?.bm_7030).toBeCloseTo(7 * 121 + 6 * 60);
  });

  it('returns nothing without data or deposits', () => {
    expect(calculateBenchmarkComparison([], [], market, live)).toEqual({ points: [], results: [] });
    expect(calculateBenchmarkComparison([], chart, [], live)).toEqual({ points: [], results: [] });
    const noDeposits = [{ date: '2026-01', principal: 0, investment: 0 }];
    expect(calculateBenchmarkComparison([], noDeposits, market, live)).toEqual({ points: [], results: [] });
  });
});

describe('utils re-exports', () => {
  it('exposes the core buy planner', () => {
    expect(typeof planCoreBuys).toBe('function');
  });
});
