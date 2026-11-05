/**
 * 목표 자산 계산 — 매달 같은 금액을 넣고 수익률이 일정하다고 가정한 단순 추정 (세금·수수료 미반영).
 */
import { addMonthsISO } from './monthly';

/** 계획 화면의 시나리오 연 수익률 */
export const GOAL_SCENARIO_RATES: readonly number[] = [0.04, 0.07, 0.1];

/** 이보다 오래 걸리면 '닿지 않음'으로 본다 (100년) */
export const MAX_GOAL_MONTHS = 1200;

function nonNegative(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** 연 수익률 → 월 수익률 (월 복리로 12개월 뒤 정확히 연 수익률이 되도록) */
export function monthlyRateOf(annualRate: number): number {
  return (1 + annualRate) ** (1 / 12) - 1;
}

/**
 * 목표까지 걸리는 개월 수. 0 = 이미 달성, null = maxMonths 안에 닿지 않음.
 * 매달 말: 자산 × (1 + 월 수익률) + 월 적립액.
 * 음수·NaN 입력은 0으로 본다.
 */
export function monthsToGoal({ current, monthly, annualRate, goal, maxMonths = MAX_GOAL_MONTHS }: {
  current: number;
  monthly: number;
  annualRate: number;
  goal: number;
  maxMonths?: number;
}): number | null {
  let asset = nonNegative(current);
  const deposit = nonNegative(monthly);
  const rate = monthlyRateOf(nonNegative(annualRate));
  if (asset >= goal) return 0;
  for (let month = 1; month <= maxMonths; month++) {
    asset = asset * (1 + rate) + deposit;
    if (asset >= goal) return month;
  }
  return null;
}

export type GoalScenario = {
  annualRate: number;
  /** 걸리는 개월 수 (0 = 이미 달성, null = 100년 안에 닿지 않음) */
  months: number | null;
  /** 닿는 달 'YYYY-MM' (닿지 않으면 null) */
  reachMonth: string | null;
};

/** 시나리오별 목표 도달 시점 — today는 KST 오늘 'YYYY-MM-DD' */
export function goalScenarios({ current, monthly, goal, today, rates = GOAL_SCENARIO_RATES }: {
  current: number;
  monthly: number;
  goal: number;
  today: string;
  rates?: readonly number[];
}): GoalScenario[] {
  return rates.map((annualRate) => {
    const months = monthsToGoal({ current, monthly, annualRate, goal });
    return {
      annualRate,
      months,
      reachMonth: months == null ? null : addMonthsISO(today, months).slice(0, 7),
    };
  });
}

/** 목표 대비 진행률 % (0~100, 목표가 없으면 0) */
export function goalProgressPct(current: number, goal: number): number {
  if (!(goal > 0)) return 0;
  return Math.min(100, Math.max(0, (current / goal) * 100));
}
