/**
 * '이번 달' 화면 계산 — 투자 대기 현금, 연환산 수익률 표시 조건, 매수 줄 편집,
 * 장부 기록 행, 시장 낙폭, 코어 비중 문구.
 */
import { CORE_GROUP_KEYS, CORE_GROUPS, getAsset, type CoreGroup } from './assets';
import { drawdownFromHigh, type CoreBuyPlan, type CoreDriftEntry } from './core';
import type { MarketDataPoint, MonthlyBudget } from './types';
import { calculateXirr, formatNum } from './utils';

function finiteOrZero(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

// ─── 투자 대기 현금 ───

export type WaitingCash = {
  /** 장부 현금 (입금 − 매수 + 매도 + 배당) */
  ledgerCash: number;
  /** 오늘까지 쌓였을 CMA 이자 추정 (장부 밖 계산값 — 매수 금액에는 넣지 않고 안내만 한다) */
  accruedInterest: number;
  /** 비상금 (투자하지 않는 금액) */
  emergencyFund: number;
  /** 투자 대기 현금 = max(0, 장부 현금 − 비상금) */
  waiting: number;
  /** 장부 현금이 있는데 비상금이 전부 가려 잔돈이 투자되지 않는 상태 */
  blockedByEmergencyFund: boolean;
};

export function waitingCashOf({ ledgerCash, accruedInterest, emergencyFund }: {
  ledgerCash: number;
  accruedInterest: number;
  emergencyFund: number;
}): WaitingCash {
  const cash = finiteOrZero(ledgerCash);
  const interest = Math.max(0, finiteOrZero(accruedInterest));
  const reserve = Math.max(0, finiteOrZero(emergencyFund));
  const waiting = Math.max(0, cash - reserve);
  return {
    ledgerCash: cash,
    accruedInterest: interest,
    emergencyFund: reserve,
    waiting,
    blockedByEmergencyFund: cash > 0 && waiting === 0,
  };
}

// ─── 연환산 수익률 (XIRR) ───

/** 첫 입금 후 이 기간이 지나야 연환산을 보여 준다 — 짧은 기간의 연환산은 과장된다 */
export const MIN_MONTHS_FOR_ANNUALIZED = 12;

/** 'YYYY-MM-DD'에 개월 수를 더한 문자열 (말일 보정 없음 — 날짜 문자열 비교용) */
export function addMonthsISO(isoDate: string, months: number): string {
  const [y, m] = isoDate.slice(0, 7).split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const month = String((total % 12) + 1).padStart(2, '0');
  return `${Math.floor(total / 12)}-${month}${isoDate.slice(7, 10)}`;
}

/**
 * 금액이 있는 입금만 (0원·날짜 없는 행은 뺀다).
 * 첫 입금일·연환산 수익률·벤치마크 비교가 모두 이 규칙을 쓴다.
 */
export function positiveDeposits(
  budgets: readonly Pick<MonthlyBudget, 'month_date' | 'amount'>[],
): { date: string; amount: number }[] {
  return budgets
    .filter((b) => typeof b.month_date === 'string' && Number(b.amount) > 0)
    .map((b) => ({ date: b.month_date.slice(0, 10), amount: Number(b.amount) }));
}

/** 금액이 있는 첫 입금일 'YYYY-MM-DD' (없으면 null) */
export function firstDepositDate(budgets: readonly Pick<MonthlyBudget, 'month_date' | 'amount'>[]): string | null {
  const dates = positiveDeposits(budgets).map((d) => d.date).sort();
  return dates[0] ?? null;
}

export type Annualized = {
  /** 첫 입금 후 12개월이 지났는지 */
  eligible: boolean;
  /** 연환산 수익률 (0.08 = 8%). 계산 불가·표시 전이면 null */
  rate: number | null;
};

/** 연환산 수익률 — 입금은 그날의 음수 흐름, 오늘 총자산은 양수 흐름 */
export function annualizedReturn({ budgets, totalAsset, today }: {
  budgets: readonly Pick<MonthlyBudget, 'month_date' | 'amount'>[];
  totalAsset: number;
  today: string;
}): Annualized {
  const first = firstDepositDate(budgets);
  if (!first || today < addMonthsISO(first, MIN_MONTHS_FOR_ANNUALIZED)) {
    return { eligible: false, rate: null };
  }
  const flows = positiveDeposits(budgets).map((d) => ({ date: d.date, amount: -d.amount }));
  return { eligible: true, rate: calculateXirr([...flows, { date: today, amount: totalAsset }]) };
}

// ─── 이번 달 매수 줄 ───

/** 사용자가 고친 값 (없으면 계산값) */
export type PlanEdit = { qty?: number; price?: number };

export type PlanRow = {
  group: CoreGroup;
  key: string;
  name: string;
  /** 계산된 수량 */
  suggestedQty: number;
  qty: number;
  /** 체결가 (기본 = 현재가) */
  price: number;
  amount: number;
};

/** 수량: 0 이상 정수 */
export function cleanQty(v: number): number {
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** 체결가: 0 이상 */
export function cleanPrice(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** 계산된 매수 줄에 사용자가 고친 수량·체결가를 반영 */
export function applyPlanEdits(plan: CoreBuyPlan, edits: Readonly<Record<string, PlanEdit>>): PlanRow[] {
  return plan.lines.map((line) => {
    const edit = edits[line.key] ?? {};
    const qty = cleanQty(edit.qty ?? line.qty);
    const price = cleanPrice(edit.price ?? line.price);
    return {
      group: line.group,
      key: line.key,
      name: getAsset(line.key)?.name ?? line.key,
      suggestedQty: line.qty,
      qty,
      price,
      amount: qty * price,
    };
  });
}

/** 매수 합계와 다음 달로 넘길 잔돈 (음수면 가용 금액 초과) */
export function planTotals(rows: readonly PlanRow[], budget: number): { spent: number; carryOver: number } {
  const spent = rows.reduce((s, r) => s + r.amount, 0);
  return { spent, carryOver: finiteOrZero(budget) - spent };
}

/** investment_records에 넣을 매수 행 */
export type NewBuyRecord = {
  date: string;
  asset_key: string;
  price: number;
  quantity: number;
  amount: number;
  is_panic_buy: false;
  batch_id: string;
  batch_deposit: number;
};

/** 수량이 있는 줄만 매수 기록으로 (batch_deposit = 이번에 새로 넣은 돈) */
export function buildBuyRecords(
  rows: readonly PlanRow[],
  { date, batchId, deposit }: { date: string; batchId: string; deposit: number },
): NewBuyRecord[] {
  return rows
    .filter((r) => r.qty > 0)
    .map((r) => ({
      date,
      asset_key: r.key,
      price: r.price,
      quantity: r.qty,
      amount: r.qty * r.price,
      is_panic_buy: false,
      batch_id: batchId,
      batch_deposit: deposit,
    }));
}

/** 저장 전 확인 창 문구 */
export function buildSaveSummary({ month, deposit, rows, budget, addsToExistingMonth }: {
  /** 1~12 */
  month: number;
  deposit: number;
  rows: readonly PlanRow[];
  /** 입금 + 투자 대기 현금 */
  budget: number;
  /** 이번 달 입금 기록이 이미 있는지 */
  addsToExistingMonth: boolean;
}): string {
  const bought = rows.filter((r) => r.qty > 0);
  const { spent, carryOver } = planTotals(bought, budget);
  const depositLine = deposit > 0
    ? `입금 ${formatNum(deposit)}원${addsToExistingMonth ? ' (이번 달 입금 기록에 더합니다)' : ''}`
    : '입금 없음 — 투자 대기 현금으로 매수';
  const buyLines = bought.length > 0
    ? bought.map((r) => `${r.name} ${formatNum(r.qty)}주 × ${formatNum(r.price)}원 = ${formatNum(r.amount)}원`)
    : ['매수 없음'];
  const carryLine = carryOver >= 0
    ? `다음 달로 이월 ${formatNum(carryOver)}원`
    : `가용 금액보다 ${formatNum(-carryOver)}원 많이 삽니다`;
  return [
    `[${month}월 ${addsToExistingMonth ? '추가 매수' : '적립'} 기록]`,
    '',
    depositLine,
    ...buyLines,
    `매수 합계 ${formatNum(spent)}원 · ${carryLine}`,
    '',
    '이대로 장부에 저장할까요?',
  ].join('\n');
}

// ─── 시장 낙폭 ───

/** 낙폭 계산에 쓰는 시세 (나스닥100은 시세가 가장 긴 TIGER 133690) */
export const DIP_SERIES: Readonly<Record<CoreGroup, string>> = { sp500: 'snp', nasdaq100: 'nasdaq' };

/** 이 % 이상 내려오면 하락장 카드를 띄운다 */
export const DIP_ALERT_PCT = 10;

/**
 * 묶음별 최근 12개월 고점 대비 낙폭 (%, 원화 기준).
 * 월 종가는 끝난 달(yearMonth 이전)만 쓰고, 이번 달은 현재가로 본다.
 */
export function marketDips(
  history: readonly MarketDataPoint[],
  live: Readonly<Record<string, number>>,
  yearMonth: string,
  months = 12,
): Record<CoreGroup, number> {
  const completed = history.filter((row) => row.d < yearMonth);
  return Object.fromEntries(
    CORE_GROUP_KEYS.map((g) => {
      const key = DIP_SERIES[g];
      const closes = completed.map((row) => Number(row[key]) || 0);
      return [g, drawdownFromHigh(closes, Number(live[key]) || 0, months)];
    }),
  ) as Record<CoreGroup, number>;
}

export function isMarketDip(dips: Readonly<Record<CoreGroup, number>>): boolean {
  return CORE_GROUP_KEYS.some((g) => dips[g] >= DIP_ALERT_PCT);
}

// ─── 코어 비중 ───

/** 목표에서 이만큼(%p) 넘게 벗어나면 안내 */
export const DRIFT_ALERT_PP = 5;

/** 목표에서 5%p 넘게 벗어났으면 더 사야 할(비중이 낮은) 묶음, 아니면 null */
export function groupToBoost(drift: Readonly<Record<CoreGroup, CoreDriftEntry>>): CoreGroup | null {
  if (!CORE_GROUP_KEYS.some((g) => Math.abs(drift[g].deviationPp) > DRIFT_ALERT_PP)) return null;
  return CORE_GROUP_KEYS.reduce((a, b) => (drift[b].deviationPp < drift[a].deviationPp ? b : a));
}

/** 비중 → 합이 100인 정수 % (S&P500 반올림, 나스닥100은 나머지) */
export function corePercents(weights: Readonly<Record<CoreGroup, number>>): Record<CoreGroup, number> {
  const sum = weights.sp500 + weights.nasdaq100;
  const sp500 = sum > 0 ? Math.round((weights.sp500 / sum) * 100) : 0;
  return { sp500, nasdaq100: sum > 0 ? 100 - sp500 : 0 };
}

export function coreGroupLabel(group: CoreGroup): string {
  return CORE_GROUPS[group].label;
}
