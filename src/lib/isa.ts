/**
 * ISA 계획 — 가입일, 의무가입 만기, 올해 납입액.
 * 날짜는 모두 'YYYY-MM-DD' 문자열로 계산한다 (오늘은 호출하는 쪽이 KST todayISO()로 넘긴다).
 */
import { ISA_MANDATORY_PERIOD_YEARS } from './constants';
import { firstDepositDate } from './monthly';
import type { MonthlyBudget } from './types';

function parts(isoDate: string): [number, number, number] {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return [y, m, d];
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 'YYYY-MM-DD' + n개월 — 그 달에 같은 날이 없으면 말일 (2024-02-29 + 12개월 → 2025-02-28) */
export function addMonthsClamped(isoDate: string, months: number): string {
  const [y, m, d] = parts(isoDate);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  const day = Math.min(d, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** from부터 to까지 꽉 찬 개월 수 (to가 from보다 앞이거나 같으면 0) */
export function wholeMonthsBetween(from: string, to: string): number {
  const [fy, fm] = parts(from);
  const [ty, tm] = parts(to);
  let months = (ty - fy) * 12 + (tm - fm);
  if (months > 0 && addMonthsClamped(from, months) > to.slice(0, 10)) months -= 1;
  return Math.max(0, months);
}

/** 의무가입 만기 = 가입일 + 3년 */
export function isaMaturityDate(openDate: string): string {
  return addMonthsClamped(openDate, ISA_MANDATORY_PERIOD_YEARS * 12);
}

export type IsaOpenDate = {
  date: string;
  /** 설정에 가입일이 없어 첫 입금일로 추정했는지 */
  estimated: boolean;
};

/** 가입일 — 설정에 적은 날짜, 없으면 첫 입금일(추정), 둘 다 없으면 null */
export function resolveIsaOpenDate(
  isaOpenDate: string | null,
  budgets: readonly Pick<MonthlyBudget, 'month_date' | 'amount'>[],
): IsaOpenDate | null {
  if (isaOpenDate) return { date: isaOpenDate.slice(0, 10), estimated: false };
  const first = firstDepositDate(budgets);
  return first ? { date: first, estimated: true } : null;
}

export type IsaMaturityStatus = {
  maturity: string;
  /** 만기일이 됐거나 지났는지 */
  passed: boolean;
  /** 만기까지 남은 꽉 찬 개월 수 (지났으면 0) */
  monthsLeft: number;
};

export function isaMaturityStatus(openDate: string, today: string): IsaMaturityStatus {
  const maturity = isaMaturityDate(openDate);
  const passed = today.slice(0, 10) >= maturity;
  return { maturity, passed, monthsLeft: passed ? 0 : wholeMonthsBetween(today, maturity) };
}

/** 그해('YYYY') 입금 합계 — 숫자가 아닌 금액은 건너뛴다 */
export function depositsInYear(
  budgets: readonly Pick<MonthlyBudget, 'month_date' | 'amount'>[],
  year: string,
): number {
  return budgets
    .filter((b) => typeof b.month_date === 'string' && b.month_date.startsWith(year))
    .map((b) => Number(b.amount))
    .filter((amount) => Number.isFinite(amount))
    .reduce((sum, amount) => sum + amount, 0);
}
