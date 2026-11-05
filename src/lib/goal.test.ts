import { describe, expect, it } from 'vitest';
import {
  GOAL_SCENARIO_RATES, MAX_GOAL_MONTHS, goalProgressPct, goalScenarios, monthlyRateOf, monthsToGoal,
} from './goal';

/** 닫힌 식: 월말 적립 D, 월 수익률 r, 시작 0 → 목표 G까지 n = ceil(ln(1 + G·r/D) / ln(1 + r)) */
const closedForm = (goal: number, monthly: number, annualRate: number): number => {
  const r = monthlyRateOf(annualRate);
  return Math.ceil(Math.log(1 + (goal * r) / monthly) / Math.log(1 + r));
};

describe('monthlyRateOf', () => {
  it('compounds back to the annual rate over 12 months', () => {
    for (const rate of GOAL_SCENARIO_RATES) {
      expect((1 + monthlyRateOf(rate)) ** 12).toBeCloseTo(1 + rate, 12);
    }
    expect(monthlyRateOf(0)).toBe(0);
  });
});

describe('monthsToGoal', () => {
  it('is 0 when the goal is already reached', () => {
    expect(monthsToGoal({ current: 100, monthly: 10, annualRate: 0.07, goal: 100 })).toBe(0);
    expect(monthsToGoal({ current: 100, monthly: 10, annualRate: 0.07, goal: 0 })).toBe(0);
  });

  it('adds deposits linearly at 0%', () => {
    expect(monthsToGoal({ current: 0, monthly: 100, annualRate: 0, goal: 1000 })).toBe(10);
    expect(monthsToGoal({ current: 0, monthly: 100, annualRate: 0, goal: 1001 })).toBe(11);
    expect(monthsToGoal({ current: 250, monthly: 100, annualRate: 0, goal: 1000 })).toBe(8);
  });

  it('grows the current asset without deposits', () => {
    // 1.07^(n/12) ≥ 2 → n ≥ 122.9
    expect(monthsToGoal({ current: 1000, monthly: 0, annualRate: 0.07, goal: 2000 })).toBe(123);
  });

  it('matches the closed form for monthly deposits', () => {
    for (const rate of GOAL_SCENARIO_RATES) {
      expect(monthsToGoal({ current: 0, monthly: 500_000, annualRate: rate, goal: 100_000_000 }))
        .toBe(closedForm(100_000_000, 500_000, rate));
    }
    expect(monthsToGoal({ current: 0, monthly: 500_000, annualRate: 0.07, goal: 100_000_000 })).toBe(135);
  });

  it('returns null when the goal is out of reach', () => {
    expect(monthsToGoal({ current: 0, monthly: 0, annualRate: 0.07, goal: 1000 })).toBeNull();
    expect(monthsToGoal({ current: 500, monthly: 0, annualRate: 0, goal: 1000 })).toBeNull();
    expect(monthsToGoal({ current: 0, monthly: 100, annualRate: 0, goal: 10_000, maxMonths: 12 })).toBeNull();
    expect(monthsToGoal({ current: 0, monthly: 1, annualRate: 0, goal: 1e9 })).toBeNull();
    expect(MAX_GOAL_MONTHS).toBe(1200);
  });

  it('treats invalid numbers as 0', () => {
    expect(monthsToGoal({ current: Number.NaN, monthly: 100, annualRate: 0, goal: 300 })).toBe(3);
    expect(monthsToGoal({ current: -500, monthly: 100, annualRate: Number.NaN, goal: 300 })).toBe(3);
  });
});

describe('goalScenarios', () => {
  it('reports months and the month the goal is reached for 4 / 7 / 10%', () => {
    const scenarios = goalScenarios({ current: 0, monthly: 500_000, goal: 100_000_000, today: '2026-11-05' });
    expect(scenarios.map((s) => s.annualRate)).toEqual([0.04, 0.07, 0.1]);
    const [low, mid, high] = scenarios;
    expect(low.months).toBeGreaterThan(mid.months ?? 0);
    expect(mid.months).toBeGreaterThan(high.months ?? 0);
    // 135개월 = 11년 3개월 → 2026-11 + 135 = 2038-02
    expect(mid).toEqual({ annualRate: 0.07, months: 135, reachMonth: '2038-02' });
  });

  it('marks a reached goal with this month and an unreachable one with null', () => {
    expect(goalScenarios({ current: 200, monthly: 0, goal: 100, today: '2026-11-05' })[0])
      .toEqual({ annualRate: 0.04, months: 0, reachMonth: '2026-11' });
    expect(goalScenarios({ current: 0, monthly: 0, goal: 100, today: '2026-11-05', rates: [0] }))
      .toEqual([{ annualRate: 0, months: null, reachMonth: null }]);
  });
});

describe('goalProgressPct', () => {
  it('clamps to 0–100 and handles a missing goal', () => {
    expect(goalProgressPct(45, 100)).toBe(45);
    expect(goalProgressPct(150, 100)).toBe(100);
    expect(goalProgressPct(-5, 100)).toBe(0);
    expect(goalProgressPct(10, 0)).toBe(0);
  });
});
