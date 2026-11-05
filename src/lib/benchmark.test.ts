import { describe, expect, it } from 'vitest';
import { BENCHMARKS, calculateBenchmarkComparison } from './benchmark';

describe('calculateBenchmarkComparison', () => {
  // 1월·3월에 1,000원씩 입금
  const budgets = [
    { month_date: '2026-01-05', amount: 1000 },
    { month_date: '2026-03-05', amount: 1000 },
  ];
  const chart = [
    { date: '2026-01', investment: 1000 },
    { date: '2026-02', investment: 1080 },
    { date: '2026-03', investment: 2150 },
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
    const { points, results } = calculateBenchmarkComparison(budgets, chart, market, live, midMarchKst);
    expect(points.map((p) => p.date)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(valuesAt(points, '2026-02')).toMatchObject({ myPortfolio: 1080, principal: 1000, bm_snp: 1100, bm_7030: 1130 });
    const march = valuesAt(points, '2026-03') as Record<string, number>;
    expect(march.bm_snp).toBeCloseTo(2210);
    expect(march.bm_7030).toBeCloseTo(1547 + 750);
    expect(march.myPortfolio).toBe(2150);
    expect(march.principal).toBe(2000);
    expect(results.map((r) => r.key)).toEqual(['bm_7030', 'bm_snp', 'myPortfolio']);
    expect(results[2].totalReturn).toBeCloseTo(7.5);
  });

  it('holds money as cash until the benchmark asset has a price', () => {
    const missingJanNasdaq = [{ d: '2026-01', snp: 100 }, { d: '2026-02', snp: 110, nasdaq: 60 }];
    const { points } = calculateBenchmarkComparison(budgets.slice(0, 1), chart.slice(0, 2), missingJanNasdaq, live, midMarchKst);
    expect(valuesAt(points, '2026-01')?.bm_7030).toBeCloseTo(700 + 300); // 나스닥 몫 300은 현금 대기
    expect(valuesAt(points, '2026-02')?.bm_7030).toBeCloseTo(7 * 110 + (300 / 60) * 60);
  });

  it('values holdings at the last valid price when a month is missing', () => {
    const gap = [{ d: '2026-01', snp: 100, nasdaq: 50 }, { d: '2026-02', snp: 0, nasdaq: 60 }];
    const { points } = calculateBenchmarkComparison(budgets.slice(0, 1), chart.slice(0, 2), gap, live, midMarchKst);
    expect(valuesAt(points, '2026-02')?.bm_snp).toBe(1000);
  });

  it('buys deposits after the last history month at live prices', () => {
    const { points } = calculateBenchmarkComparison(budgets, chart, market.slice(0, 2), live, midMarchKst);
    expect(points.map((p) => p.date)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(valuesAt(points, '2026-03')).toMatchObject({ principal: 2000 });
    expect((valuesAt(points, '2026-03') as Record<string, number>).bm_snp).toBeCloseTo(2210);
  });

  it('buys a deposit made before the month\'s first trading day at the live price', () => {
    // 3월 1일(일) 입금 — 3월 월봉이 아직 없다. 차트 마지막 점(2월)은 오늘 총자산을 담는다
    const sundayDeposit = [{ month_date: '2026-01-05', amount: 1000 }, { month_date: '2026-03-01', amount: 500 }];
    const todayChart = [{ date: '2026-01', investment: 1000 }, { date: '2026-02', investment: 1600 }];
    const { points, results } = calculateBenchmarkComparison(
      sundayDeposit, todayChart, market.slice(0, 2), live, new Date('2026-03-01T03:00:00Z'),
    );
    expect(points.map((p) => p.date)).toEqual(['2026-01', '2026-02', '2026-03']);
    const today = valuesAt(points, '2026-03') as Record<string, number>;
    expect(today.principal).toBe(1500);
    expect(today.myPortfolio).toBe(1600);
    expect(today.bm_snp).toBeCloseTo(10 * 121 + 500);
    expect(results.find((r) => r.key === 'bm_snp')?.totalReturn).toBeCloseTo((1710 / 1500 - 1) * 100);
  });

  it('buys a deposit from a month without prices in the next month that has them', () => {
    const noFeb = [{ d: '2026-01', snp: 100, nasdaq: 50 }, { d: '2026-03', snp: 125, nasdaq: 75 }];
    const febDeposit = [{ month_date: '2026-01-05', amount: 1000 }, { month_date: '2026-02-05', amount: 1000 }];
    const { points } = calculateBenchmarkComparison(
      febDeposit, [{ date: '2026-01', investment: 1000 }, { date: '2026-03', investment: 2300 }], noFeb, { snp: 125, nasdaq: 75 }, midMarchKst,
    );
    expect(points.map((p) => p.date)).toEqual(['2026-01', '2026-03']);
    expect(valuesAt(points, '2026-03')).toMatchObject({ principal: 2000, bm_snp: 10 * 125 + 1000 });
  });

  it('sums several deposit rows in one month and skips 0원 rows', () => {
    const rows = [
      { month_date: '2025-12-20', amount: 0 },
      { month_date: '2026-01-05', amount: 600 },
      { month_date: '2026-01-20', amount: 400 },
    ];
    const { points } = calculateBenchmarkComparison(rows, chart.slice(0, 1), market.slice(0, 1), live, new Date('2026-01-25T03:00:00Z'));
    expect(points.map((p) => p.date)).toEqual(['2026-01']);
    expect(points[0]).toMatchObject({ principal: 1000, bm_snp: 1210 });
  });

  it('returns nothing without data or deposits', () => {
    expect(calculateBenchmarkComparison(budgets, [], market, live)).toEqual({ points: [], results: [] });
    expect(calculateBenchmarkComparison(budgets, chart, [], live)).toEqual({ points: [], results: [] });
    const onlyEmptyRows = [{ month_date: '2026-01-05', amount: 0 }];
    expect(calculateBenchmarkComparison(onlyEmptyRows, chart, market, live)).toEqual({ points: [], results: [] });
  });
});
