import { describe, expect, it } from 'vitest';
import { coreDrift, drawdownFromHigh, planCoreBuys } from './core';

const WEIGHTS_7030 = { sp500: 0.7, nasdaq100: 0.3 };
const vehicles = (snp: number, kodex: number) => ({
  sp500: { key: 'snp', price: snp },
  nasdaq100: { key: 'nasdaq_kodex', price: kodex },
});
const qtyOf = (plan: ReturnType<typeof planCoreBuys>) => plan.lines.map((l) => [l.key, l.qty]);

describe('planCoreBuys', () => {
  it('splits 500,000 KRW 70:30 into 13 + 6 shares with 18,445 left over', () => {
    const plan = planCoreBuys({ amount: 500000, weights: WEIGHTS_7030, vehicles: vehicles(25525, 24955) });
    expect(plan.lines).toEqual([
      { group: 'sp500', key: 'snp', qty: 13, price: 25525, cost: 331825 },
      { group: 'nasdaq100', key: 'nasdaq_kodex', qty: 6, price: 24955, cost: 149730 },
    ]);
    expect(plan.spent).toBe(481555);
    expect(plan.leftover).toBe(18445);
  });

  it('spends rounding leftovers on the group furthest below target', () => {
    // floor: 3 S&P (76,575) + 1 나스닥 (24,955), 남은 28,470 → 부족액 큰 S&P에 1주 추가
    const plan = planCoreBuys({ amount: 130000, weights: WEIGHTS_7030, vehicles: vehicles(25525, 24955) });
    expect(qtyOf(plan)).toEqual([['snp', 4], ['nasdaq_kodex', 1]]);
    expect(plan.spent).toBe(102100 + 24955);
    expect(plan.leftover).toBe(2945);
  });

  it('does not keep buying a group past its target when the other is unaffordable', () => {
    // 목표 80,000 / 20,000. floor 후 S&P(30,000)는 못 사고 나스닥만 1주 추가 → 나머지는 이월
    const plan = planCoreBuys({
      amount: 100000,
      weights: { sp500: 0.8, nasdaq100: 0.2 },
      vehicles: vehicles(30000, 7000),
    });
    expect(qtyOf(plan)).toEqual([['snp', 2], ['nasdaq_kodex', 3]]);
    expect(plan.leftover).toBe(19000);
  });

  it('buys nothing for a zero amount', () => {
    const plan = planCoreBuys({ amount: 0, weights: WEIGHTS_7030, vehicles: vehicles(25525, 24955) });
    expect(qtyOf(plan)).toEqual([['snp', 0], ['nasdaq_kodex', 0]]);
    expect(plan.spent).toBe(0);
    expect(plan.leftover).toBe(0);
  });

  it('treats a negative or non-finite amount as zero', () => {
    expect(planCoreBuys({ amount: -1000, weights: WEIGHTS_7030, vehicles: vehicles(100, 100) }).spent).toBe(0);
    expect(planCoreBuys({ amount: Number.NaN, weights: WEIGHTS_7030, vehicles: vehicles(100, 100) }).leftover).toBe(0);
  });

  it('keeps a group\'s money in leftover when its price is missing', () => {
    const plan = planCoreBuys({ amount: 500000, weights: WEIGHTS_7030, vehicles: vehicles(25525, 0) });
    expect(qtyOf(plan)).toEqual([['snp', 13], ['nasdaq_kodex', 0]]);
    expect(plan.spent).toBe(331825);
    expect(plan.leftover).toBe(150000 + 18175); // 나스닥 몫 전액 + S&P 반올림 잔액
    const nan = planCoreBuys({ amount: 500000, weights: WEIGHTS_7030, vehicles: vehicles(Number.NaN, 24955) });
    expect(qtyOf(nan)).toEqual([['snp', 0], ['nasdaq_kodex', 6]]);
    expect(nan.lines[0].price).toBe(0);
    expect(nan.leftover).toBe(500000 - 149730);
  });

  it('normalizes weights and never buys a zero-weight group', () => {
    const scaled = planCoreBuys({ amount: 500000, weights: { sp500: 7, nasdaq100: 3 }, vehicles: vehicles(25525, 24955) });
    expect(qtyOf(scaled)).toEqual([['snp', 13], ['nasdaq_kodex', 6]]);

    // S&P만 100%: 남은 23,425로 나스닥 1주(20,000)를 살 수 있어도 사지 않는다
    const spOnly = planCoreBuys({ amount: 100000, weights: { sp500: 1, nasdaq100: 0 }, vehicles: vehicles(25525, 20000) });
    expect(qtyOf(spOnly)).toEqual([['snp', 3], ['nasdaq_kodex', 0]]);
    expect(spOnly.leftover).toBe(100000 - 76575);

    const none = planCoreBuys({ amount: 100000, weights: { sp500: 0, nasdaq100: -1 }, vehicles: vehicles(100, 100) });
    expect(none.spent).toBe(0);
    expect(none.leftover).toBe(100000);
  });
});

describe('coreDrift', () => {
  it('counts both Nasdaq-100 ETFs toward the nasdaq100 group', () => {
    const drift = coreDrift({ snp: 700, nasdaq: 200, nasdaq_kodex: 100, tech10: 5000 }, WEIGHTS_7030);
    expect(drift.sp500).toEqual({ value: 700, weight: 0.7, target: 0.7, deviationPp: 0 });
    expect(drift.nasdaq100.value).toBe(300);
    expect(drift.nasdaq100.weight).toBeCloseTo(0.3);
    expect(drift.nasdaq100.deviationPp).toBeCloseTo(0);
  });

  it('reports deviation in percentage points', () => {
    const drift = coreDrift({ snp: 800, nasdaq: 100, nasdaq_kodex: 100 }, { sp500: 7, nasdaq100: 3 });
    expect(drift.sp500.deviationPp).toBeCloseTo(10);
    expect(drift.nasdaq100.deviationPp).toBeCloseTo(-10);
    expect(drift.nasdaq100.target).toBeCloseTo(0.3);
  });

  it('returns zero weights and deviations when there are no core holdings', () => {
    const drift = coreDrift({ snp: 0, samsung: 1000, nasdaq: Number.NaN, nasdaq_kodex: -50 }, WEIGHTS_7030);
    expect(drift.sp500).toEqual({ value: 0, weight: 0, target: 0.7, deviationPp: 0 });
    expect(drift.nasdaq100).toEqual({ value: 0, weight: 0, target: 0.3, deviationPp: 0 });
  });
});

describe('drawdownFromHigh', () => {
  it('measures the live price against the recent high', () => {
    expect(drawdownFromHigh([100, 120, 110], 102)).toBeCloseTo(15);
  });

  it('is 0 at or above the high', () => {
    expect(drawdownFromHigh([100, 120, 110], 125)).toBe(0);
    expect(drawdownFromHigh([100, 120], 120)).toBe(0);
  });

  it('only looks at the last `months` closes', () => {
    const closes = [200, ...Array.from({ length: 12 }, () => 100)];
    expect(drawdownFromHigh(closes, 90)).toBeCloseTo(10); // 13개월 전 200은 제외
    expect(drawdownFromHigh(closes, 90, 13)).toBeCloseTo(55);
    expect(drawdownFromHigh(closes, 90, 0)).toBe(0);
    expect(drawdownFromHigh(closes, 90, 0.5)).toBe(0);
  });

  it('ignores invalid closes and returns 0 without a live price', () => {
    expect(drawdownFromHigh([0, Number.NaN, 100, -1], 80)).toBeCloseTo(20);
    expect(drawdownFromHigh([100, 120], 0)).toBe(0);
    expect(drawdownFromHigh([100, 120], Number.NaN)).toBe(0);
    expect(drawdownFromHigh([], 100)).toBe(0);
  });
});
