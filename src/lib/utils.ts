import type { DividendRecord, InvestmentRecord, MonthlyBudget } from './types';
import { todayISO } from './date';

export { planCoreBuys, coreDrift, drawdownFromHigh } from './core';
export type { CoreBuyLine, CoreBuyPlan, CoreDriftEntry } from './core';

/** 현금으로 들어오는 배당 (날짜·금액만 사용) */
export type CashDividend = Pick<DividendRecord, 'date' | 'amount'>;

/** 기록의 유효 매수액: amount_override가 있으면 사용, 없으면 amount */
export function getRecordAmount(r: {
  amount?: number | string;
  amount_override?: number | null;
}): number {
  const v = r?.amount_override ?? r?.amount;
  return Number(v ?? 0);
}

/** 기록의 유효 수량: 비트코인은 amount_override 있으면 (amount_override/price) */
export function getRecordQty(r: {
  asset_key?: string;
  quantity?: number | string;
  price?: number | string;
  amount_override?: number | null;
}): number {
  const baseQty = Number(r?.quantity ?? 0);
  if (r?.asset_key !== 'btc') {
    return baseQty;
  }
  const override = r?.amount_override;
  const price = Number(r?.price ?? 0);
  if (override == null || !Number.isFinite(override) || override <= 0) {
    return baseQty;
  }
  if (!price || !Number.isFinite(price) || price <= 0) {
    return baseQty;
  }
  return Number(override) / price;
}

/** 매수 기록만 필터 (type이 없으면 buy로 간주) */
export function filterBuyRecords(records: InvestmentRecord[]): InvestmentRecord[] {
  return records.filter((r) => !r.type || r.type === 'buy');
}

/** 매도 기록만 필터 */
export function filterSellRecords(records: InvestmentRecord[]): InvestmentRecord[] {
  return records.filter((r) => r.type === 'sell');
}

/** 특정 날짜(YYYY-MM-DD) 기준 CMA 잔액: 누적 입금 - 누적 매수 + 누적 매도 + 누적 배당 */
export function getCashBalanceOnDate(
  dateStr: string,
  budgets: MonthlyBudget[],
  records: InvestmentRecord[],
  dividends: CashDividend[] = [],
): number {
  const deposit =
    budgets
      .filter((b) => (b.month_date || '').substring(0, 10) <= dateStr)
      .reduce((acc, cur) => acc + Number(cur.amount ?? 0), 0) || 0;

  const buyRecords = filterBuyRecords(records);
  const sellRecords = filterSellRecords(records);

  const spent =
    buyRecords
      .filter((r) => (r.date || '').substring(0, 10) <= dateStr)
      .reduce((acc, cur) => acc + getRecordAmount(cur), 0) || 0;

  const sellProceeds =
    sellRecords
      .filter((r) => (r.date || '').substring(0, 10) <= dateStr)
      .reduce((acc, cur) => acc + getRecordAmount(cur), 0) || 0;

  const dividendIncome =
    dividends
      .filter((d) => (d.date || '').substring(0, 10) <= dateStr)
      .reduce((acc, cur) => acc + Number(cur.amount ?? 0), 0) || 0;

  return Math.max(0, deposit - spent + sellProceeds + dividendIncome);
}

/** 해당 월(YYYY-MM) 동안 일별 잔액 기준으로 쌓인 CMA 이자 */
export function getInterestAccruedInMonth(
  yearMonth: string,
  budgets: MonthlyBudget[],
  records: InvestmentRecord[],
  annualRatePct: number,
  dividends: CashDividend[] = [],
): number {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return 0;
  const lastDay = new Date(y, m, 0).getDate();
  let interest = 0;
  const dailyRate = annualRatePct / 100 / 365;
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const balance = getCashBalanceOnDate(dateStr, budgets, records, dividends);
    interest += balance * dailyRate;
  }
  return interest;
}

/** 월별 시점까지의 누적 CMA 이자 */
export function getCumulativeInterestByMonths(
  monthStrings: string[],
  budgets: MonthlyBudget[],
  records: InvestmentRecord[],
  annualRatePct: number,
  dividends: CashDividend[] = [],
): number[] {
  const out: number[] = [];
  let cum = 0;
  for (const ym of monthStrings) {
    cum += getInterestAccruedInMonth(ym, budgets, records, annualRatePct, dividends);
    out.push(cum);
  }
  return out;
}

/** 현재월 1일 ~ 오늘까지 쌓인 이자 (날짜는 KST 기준) */
export function getInterestFromMonthStartToToday(
  budgets: MonthlyBudget[],
  records: InvestmentRecord[],
  annualRatePct: number,
  dividends: CashDividend[] = [],
  now: Date = new Date(),
): number {
  const todayStr = todayISO(now);
  const yearMonth = todayStr.slice(0, 7);
  const today = Number(todayStr.slice(8, 10));
  let interest = 0;
  const dailyRate = annualRatePct / 100 / 365;
  for (let d = 1; d <= today; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const balance = getCashBalanceOnDate(dateStr, budgets, records, dividends);
    interest += balance * dailyRate;
  }
  return interest;
}

/** 숫자 포맷 (정수, 콤마) */
export function formatNum(n: number): string {
  return Math.floor(n).toLocaleString();
}

/** 숫자 포맷 (소수점 최대 6자리) */
export function formatDec(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

/** 부호 붙인 퍼센트 '+12.3%' · '−4.5%' (음수는 유니코드 마이너스, 반올림해 0이면 부호 없음) */
export function formatSignedPercent(value: number, digits = 1, unit = '%'): string {
  const v = Number.isFinite(value) ? value : 0;
  const text = Math.abs(v).toFixed(digits);
  if (Number(text) === 0) return `${text}${unit}`;
  return `${v > 0 ? '+' : '−'}${text}${unit}`;
}

/** 자산별 보유 현황 (이동평균법) */
export type Position = {
  /** 보유 수량 */
  qty: number;
  /** 보유분 취득원가 (= 평균단가 × 보유 수량) */
  cost: number;
  /** 이동평균 단가 (보유가 없으면 0) */
  avgCost: number;
};

type RealizedSell = { assetKey: string; date: string; pnl: number };

/** 이 수량 이하로 남으면 전량 매도로 본다 (BTC 소수 수량의 부동소수 오차 흡수) */
const QTY_EPSILON = 1e-9;

const EMPTY_POSITION: Position = { qty: 0, cost: 0, avgCost: 0 };

/** 날짜순, 같은 날은 매수 먼저 (보유 없이 매도하는 순서를 피함), 그다음 입력 순서 */
function chronological(records: InvestmentRecord[]): InvestmentRecord[] {
  const sellRank = (r: InvestmentRecord): number => (r.type === 'sell' ? 1 : 0);
  return records
    .map((r, i) => ({ r, i }))
    .sort(
      (a, b) =>
        (a.r.date || '').slice(0, 10).localeCompare((b.r.date || '').slice(0, 10)) ||
        sellRank(a.r) - sellRank(b.r) ||
        a.i - b.i,
    )
    .map(({ r }) => r);
}

function applyBuy(p: Position, qty: number, amount: number): Position {
  const nextQty = p.qty + qty;
  const nextCost = p.cost + amount;
  return { qty: nextQty, cost: nextCost, avgCost: nextQty > QTY_EPSILON ? nextCost / nextQty : 0 };
}

/** 매도: 수량만 줄고 평균단가는 유지. 전량 매도면 원가 기준 초기화 */
function applySell(p: Position, qty: number): Position {
  const nextQty = p.qty - qty;
  if (nextQty <= QTY_EPSILON) return EMPTY_POSITION;
  return { qty: nextQty, cost: p.avgCost * nextQty, avgCost: p.avgCost };
}

/**
 * 이동평균법 장부 — 자산별로 기록을 날짜순 처리한다.
 * - 매수: 평균단가 = (보유 원가 + 매수액) / (보유 수량 + 매수 수량)
 * - 매도: 실현 손익 = 매도액 − 평균단가 × 매도 수량
 */
function runMovingAverage(records: InvestmentRecord[]): {
  positions: Record<string, Position>;
  sells: RealizedSell[];
} {
  const positions: Record<string, Position> = {};
  const sells: RealizedSell[] = [];
  for (const r of chronological(records)) {
    const key = r.asset_key;
    const prev = positions[key] ?? EMPTY_POSITION;
    const qty = getRecordQty(r);
    if (r.type === 'sell') {
      sells.push({ assetKey: key, date: r.date || '', pnl: getRecordAmount(r) - prev.avgCost * qty });
      positions[key] = applySell(prev, qty);
    } else {
      positions[key] = applyBuy(prev, qty, getRecordAmount(r));
    }
  }
  return { positions, sells };
}

/** 자산별 현재 보유 수량·취득원가·평균단가 (이동평균법) */
export function calculatePositions(records: InvestmentRecord[]): Record<string, Position> {
  return runMovingAverage(records).positions;
}

/**
 * 자산별 실현 손익 (이동평균법).
 * 평균단가는 전체 기록을 날짜순으로 따라가며 구하고,
 * sellYear를 주면 해당 연도의 매도만 손익에 집계한다.
 */
export function calculateRealizedPnl(
  records: InvestmentRecord[],
  sellYear?: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const s of runMovingAverage(records).sells) {
    if (sellYear != null && !s.date.startsWith(String(sellYear))) continue;
    result[s.assetKey] = (result[s.assetKey] ?? 0) + s.pnl;
  }
  return result;
}

/**
 * 자금가중 연수익률 (XIRR, 이분법).
 * cashflows: 입금(투자)은 음수, 최종 평가액은 양수. date는 YYYY-MM-DD.
 * 유효한 해를 찾지 못하면 null.
 */
export function calculateXirr(
  cashflows: { date: string; amount: number }[],
): number | null {
  if (cashflows.length < 2) return null;
  if (!cashflows.some((c) => c.amount < 0) || !cashflows.some((c) => c.amount > 0)) {
    return null;
  }

  const sorted = [...cashflows].sort((a, b) => a.date.localeCompare(b.date));
  const t0 = new Date(sorted[0].date).getTime();
  const flows = sorted.map((c) => ({
    years: (new Date(c.date).getTime() - t0) / (365.25 * 24 * 3600 * 1000),
    amount: c.amount,
  }));

  const npv = (rate: number) =>
    flows.reduce((s, f) => s + f.amount / Math.pow(1 + rate, f.years), 0);

  let lo = -0.99;
  let hi = 10;
  let npvLo = npv(lo);
  if (npvLo * npv(hi) > 0) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-7) return mid;
    if (v * npvLo > 0) {
      lo = mid;
      npvLo = v;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
