import { describe, expect, it } from 'vitest';
import type { AssetPortfolio } from './types';
import { coreAllocation, holdOnlyHoldings } from './holdings';

const WEIGHTS_7030 = { sp500: 0.7, nasdaq100: 0.3 };

const position = (qty: number, avg: number, price: number): AssetPortfolio => ({
  qty, avg, cost: qty * avg, val: qty * price, roi: 0, weight: 0, realizedPnl: 0,
});

const prices = { snp: 25_000, nasdaq: 120_000, nasdaq_kodex: 25_000, tech10: 18_000, gold: 50_000, samsung: 0 };

describe('coreAllocation', () => {
  const portfolio = {
    snp: position(100, 20_000, prices.snp), // 2,500,000 / 원금 2,000,000
    nasdaq: position(10, 90_000, prices.nasdaq), // 1,200,000 / 900,000
    nasdaq_kodex: position(0, 0, prices.nasdaq_kodex),
    tech10: position(5, 20_000, prices.tech10), // 보유만 — 코어에서 제외
    cash: position(0, 0, 0),
  };

  it('sums value and remaining cost per group, TIGER + KODEX together for Nasdaq-100', () => {
    const { groups, total, boost } = coreAllocation(portfolio, prices, WEIGHTS_7030);
    expect(total).toBe(3_700_000);
    expect(boost).toBeNull();
    const [sp500, nasdaq100] = groups;
    expect(sp500).toMatchObject({ group: 'sp500', label: 'S&P500', value: 2_500_000, cost: 2_000_000, targetPct: 70 });
    expect(sp500.roiPct).toBeCloseTo(25);
    expect(sp500.weightPct).toBeCloseTo((2_500_000 / 3_700_000) * 100);
    expect(sp500.deviationPp).toBeCloseTo((2_500_000 / 3_700_000) * 100 - 70);
    expect(nasdaq100).toMatchObject({ group: 'nasdaq100', label: '나스닥100', value: 1_200_000, cost: 900_000 });
    expect(nasdaq100.roiPct).toBeCloseTo(33.333, 2);
    expect(nasdaq100.deviationPp).toBeCloseTo(-sp500.deviationPp);
  });

  it('lists only held ETFs with quantity, average cost, price and value', () => {
    const [sp500, nasdaq100] = coreAllocation(
      { ...portfolio, nasdaq_kodex: position(4, 24_000, prices.nasdaq_kodex) }, prices, WEIGHTS_7030,
    ).groups;
    expect(sp500.positions).toEqual([
      { key: 'snp', name: 'TIGER 미국S&P500', qty: 100, avg: 20_000, price: 25_000, value: 2_500_000, cost: 2_000_000 },
    ]);
    expect(nasdaq100.positions.map((p) => p.key)).toEqual(['nasdaq', 'nasdaq_kodex']);
    expect(nasdaq100.value).toBe(1_300_000);
    expect(nasdaq100.cost).toBe(996_000);
  });

  it('names the underweight group once a deviation exceeds 5%p', () => {
    const drifted = { ...portfolio, snp: position(80, 20_000, prices.snp) }; // 2,000,000 vs 1,200,000 → 62.5%
    expect(coreAllocation(drifted, prices, WEIGHTS_7030).boost).toBe('sp500');
    const heavy = { ...portfolio, nasdaq: position(30, 90_000, prices.nasdaq) }; // 2.5M vs 3.6M
    expect(coreAllocation(heavy, prices, WEIGHTS_7030).boost).toBe('sp500');
    const light = { ...portfolio, nasdaq: position(1, 90_000, prices.nasdaq) }; // 2.5M vs 0.12M
    expect(coreAllocation(light, prices, WEIGHTS_7030).boost).toBe('nasdaq100');
  });

  it('does not judge return or drift while a held ETF has no price', () => {
    // KODEX 시세를 못 받아 평가액이 0으로 잡힌 상태 — -100%나 비중 이탈 안내를 띄우면 안 된다
    const unpriced = { ...portfolio, nasdaq_kodex: { ...position(40, 24_000, 0), val: 0 } };
    const { groups, boost } = coreAllocation(unpriced, { ...prices, nasdaq_kodex: 0 }, { sp500: 0.4, nasdaq100: 0.6 });
    const [sp500, nasdaq100] = groups;
    expect(nasdaq100.missingPrice).toBe(true);
    expect(nasdaq100.roiPct).toBeNull();
    expect(sp500.missingPrice).toBe(false);
    expect(sp500.roiPct).toBeCloseTo(25);
    expect(Math.abs(sp500.deviationPp)).toBeGreaterThan(5);
    expect(boost).toBeNull();
  });

  it('returns zeros and no return without core holdings', () => {
    const { groups, total, boost } = coreAllocation({ tech10: portfolio.tech10 }, prices, WEIGHTS_7030);
    expect(total).toBe(0);
    expect(boost).toBeNull();
    expect(groups.map((g) => [g.value, g.cost, g.roiPct, g.weightPct, g.deviationPp, g.positions.length]))
      .toEqual([[0, 0, null, 0, 0, 0], [0, 0, null, 0, 0, 0]]);
    expect(groups.map((g) => g.targetPct)).toEqual([70, 30]);
  });
});

describe('holdOnlyHoldings', () => {
  const portfolio = {
    snp: position(100, 20_000, prices.snp),
    tech10: position(5, 20_000, prices.tech10), // 90,000 / 원금 100,000
    gold: position(10, 40_000, prices.gold), // 500,000 / 400,000
    samsung: position(0, 0, 0),
    kodex200: position(3, 30_000, 0), // 시세 없음 — 평가액 0
  };

  it('lists held hold-only assets by value with return and share of total assets', () => {
    const rows = holdOnlyHoldings(portfolio, prices, 10_000_000);
    expect(rows.map((r) => r.key)).toEqual(['gold', 'tech10', 'kodex200']);
    const [gold, tech10, kodex200] = rows;
    expect(gold).toMatchObject({ name: 'TIGER KRX금현물', qty: 10, avg: 40_000, price: 50_000, value: 500_000, cost: 400_000 });
    expect(gold.roiPct).toBeCloseTo(25);
    expect(gold.sharePct).toBeCloseTo(5);
    expect(tech10.roiPct).toBeCloseTo(-10);
    expect(tech10.sharePct).toBeCloseTo(0.9);
    // 시세가 없으면 -100%로 보이지 않도록 수익률을 비운다
    expect(kodex200).toMatchObject({ price: 0, value: 0, roiPct: null });
  });

  it('is empty without hold-only holdings and safe with zero total assets', () => {
    expect(holdOnlyHoldings({ snp: portfolio.snp }, prices, 10_000_000)).toEqual([]);
    expect(holdOnlyHoldings(portfolio, prices, 0).every((r) => r.sharePct === 0)).toBe(true);
  });
});
