import { describe, expect, it } from 'vitest';
import { BENCHMARKS, calculateBenchmarkComparison } from './benchmark';

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
