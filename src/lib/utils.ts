import type { InvestmentRecord, MonthlyBudget, TaxSimulation, DividendRecord } from './types';
import { FOREIGN_ASSET_KEYS, FOREIGN_TAX_EXEMPTION, FOREIGN_TAX_RATE, DIVIDEND_TAX_RATE } from './constants';

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

/** 특정 날짜(YYYY-MM-DD) 기준 CMA 잔액: 누적 입금 - 누적 매수 + 누적 매도 */
export function getCashBalanceOnDate(
  dateStr: string,
  budgets: MonthlyBudget[],
  records: InvestmentRecord[],
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

  return Math.max(0, deposit - spent + sellProceeds);
}

/** 해당 월(YYYY-MM) 동안 일별 잔액 기준으로 쌓인 CMA 이자 */
export function getInterestAccruedInMonth(
  yearMonth: string,
  budgets: MonthlyBudget[],
  records: InvestmentRecord[],
  annualRatePct: number,
): number {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return 0;
  const lastDay = new Date(y, m, 0).getDate();
  let interest = 0;
  const dailyRate = annualRatePct / 100 / 365;
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const balance = getCashBalanceOnDate(dateStr, budgets, records);
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
): number[] {
  const out: number[] = [];
  let cum = 0;
  for (const ym of monthStrings) {
    cum += getInterestAccruedInMonth(ym, budgets, records, annualRatePct);
    out.push(cum);
  }
  return out;
}

/** 현재월 1일 ~ 오늘까지 쌓인 이자 */
export function getInterestFromMonthStartToToday(
  budgets: MonthlyBudget[],
  records: InvestmentRecord[],
  annualRatePct: number,
): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const today = now.getDate();
  let interest = 0;
  const dailyRate = annualRatePct / 100 / 365;
  for (let d = 1; d <= today; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const balance = getCashBalanceOnDate(dateStr, budgets, records);
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

/** 자산별 실현 손익 계산 (매도 기록 기반, 평균 단가법) */
export function calculateRealizedPnl(
  records: InvestmentRecord[],
): Record<string, number> {
  const result: Record<string, number> = {};
  const buyRecords = filterBuyRecords(records);
  const sellRecords = filterSellRecords(records);

  // 자산별 평균 매수단가 계산
  const avgCostByAsset: Record<string, number> = {};
  const qtyByAsset: Record<string, number> = {};

  for (const r of buyRecords) {
    const key = r.asset_key;
    const qty = getRecordQty(r);
    const cost = getRecordAmount(r);
    if (!qtyByAsset[key]) {
      qtyByAsset[key] = 0;
      avgCostByAsset[key] = 0;
    }
    const totalCost = avgCostByAsset[key] * qtyByAsset[key] + cost;
    qtyByAsset[key] += qty;
    avgCostByAsset[key] = qtyByAsset[key] > 0 ? totalCost / qtyByAsset[key] : 0;
  }

  // 매도별 실현 손익 = (매도가 - 평균매수가) × 매도수량
  for (const r of sellRecords) {
    const key = r.asset_key;
    const sellQty = getRecordQty(r);
    const sellAmount = getRecordAmount(r);
    const avgCost = avgCostByAsset[key] ?? 0;
    const costBasis = avgCost * sellQty;
    const pnl = sellAmount - costBasis;
    result[key] = (result[key] ?? 0) + pnl;
  }

  return result;
}

/** 세금 시뮬레이션 계산 */
export function calculateTaxSimulation(
  records: InvestmentRecord[],
  dividends: DividendRecord[],
  year?: number,
): TaxSimulation {
  const targetYear = year ?? new Date().getFullYear();
  const yearStr = String(targetYear);

  const realizedPnl = calculateRealizedPnl(
    records.filter((r) => r.date.startsWith(yearStr)),
  );

  // 해외주식 양도차익
  const foreignGain = FOREIGN_ASSET_KEYS.reduce(
    (sum, key) => sum + Math.max(0, realizedPnl[key] ?? 0),
    0,
  );
  const foreignTaxBase = Math.max(0, foreignGain - FOREIGN_TAX_EXEMPTION);
  const foreignTax = Math.round(foreignTaxBase * FOREIGN_TAX_RATE);

  // 국내주식 양도차익 (대주주가 아니면 비과세이지만 참고용)
  const domesticGain = Object.entries(realizedPnl)
    .filter(([key]) => !FOREIGN_ASSET_KEYS.includes(key))
    .reduce((sum, [, pnl]) => sum + Math.max(0, pnl), 0);

  // 배당소득세
  const yearDividends = dividends.filter((d) => d.date.startsWith(yearStr));
  const totalDividendAmount = yearDividends.reduce((sum, d) => sum + d.amount, 0);
  const dividendTax = Math.round(totalDividendAmount * DIVIDEND_TAX_RATE);

  return {
    foreignGain,
    foreignExemption: FOREIGN_TAX_EXEMPTION,
    foreignTaxBase,
    foreignTax,
    domesticGain,
    dividendTax,
    totalEstimatedTax: foreignTax + dividendTax,
  };
}

/** 목표 달성 예상일 계산 (현재 자산, 월 투자액, 예상 연수익률 기반) */
export function estimateGoalDate(
  currentAsset: number,
  monthlyInvestment: number,
  annualReturnPct: number,
  goalAmount: number,
): Date | null {
  if (currentAsset >= goalAmount) return new Date();
  if (monthlyInvestment <= 0 && annualReturnPct <= 0) return null;

  const monthlyReturn = annualReturnPct / 100 / 12;
  let asset = currentAsset;
  const now = new Date();
  let months = 0;
  const maxMonths = 12 * 100; // 최대 100년

  while (asset < goalAmount && months < maxMonths) {
    asset = asset * (1 + monthlyReturn) + monthlyInvestment;
    months++;
  }

  if (months >= maxMonths) return null;

  const result = new Date(now);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** MDD(최대 낙폭) 계산 */
export function calculateMDD(values: number[]): { mdd: number; peakIdx: number; troughIdx: number } {
  let maxMDD = 0;
  let peak = values[0] ?? 0;
  let peakIdx = 0;
  let mddPeakIdx = 0;
  let mddTroughIdx = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
      peakIdx = i;
    }
    const drawdown = peak > 0 ? (peak - values[i]) / peak : 0;
    if (drawdown > maxMDD) {
      maxMDD = drawdown;
      mddPeakIdx = peakIdx;
      mddTroughIdx = i;
    }
  }

  return { mdd: maxMDD * 100, peakIdx: mddPeakIdx, troughIdx: mddTroughIdx };
}
