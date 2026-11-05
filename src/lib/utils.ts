import type {
  InvestmentRecord, MonthlyBudget, TaxSimulation, DividendRecord,
  BenchmarkPoint, BenchmarkResult,
} from './types';
import type { IsaType } from './constants';
import {
  FOREIGN_TAX_EXEMPTION, FOREIGN_TAX_RATE, DIVIDEND_TAX_RATE,
  ISA_ELIGIBLE_KEYS, NON_ISA_KEYS, ISA_TAX_FREE_LIMIT, ISA_SEPARATED_TAX_RATE,
  CRYPTO_TAX_EFFECTIVE_YEAR, TAXABLE_GAIN_KEYS,
} from './constants';
import { currentYearMonth, todayISO } from './date';

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

/** 자산별 현재 이동평균 단가 */
function averageBuyCosts(records: InvestmentRecord[]): Record<string, number> {
  return Object.fromEntries(
    Object.entries(calculatePositions(records)).map(([key, p]) => [key, p.avgCost]),
  );
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
 * 가상자산(ISA 밖) 연도별 과세 — 그해 손익을 통산해 250만원 공제 후 22%.
 * 2027년 귀속분부터 시행이라 그 전 연도 이익은 과세표준에 넣지 않는다.
 */
function cryptoTaxBase(
  records: InvestmentRecord[],
  year?: number,
): { btcGain: number; btcTaxBase: number } {
  const sellYears = filterSellRecords(records)
    .filter((r) => NON_ISA_KEYS.includes(r.asset_key))
    .map((r) => Number((r.date || '').slice(0, 4)))
    .filter((y) => Number.isFinite(y) && y > 0);
  const years = year != null ? [year] : Array.from(new Set(sellYears));

  return years.reduce(
    (acc, y) => {
      const pnl = calculateRealizedPnl(records, y);
      const gain = Math.max(0, NON_ISA_KEYS.reduce((sum, key) => sum + (pnl[key] ?? 0), 0));
      const base = y >= CRYPTO_TAX_EFFECTIVE_YEAR ? Math.max(0, gain - FOREIGN_TAX_EXEMPTION) : 0;
      return { btcGain: acc.btcGain + gain, btcTaxBase: acc.btcTaxBase + base };
    },
    { btcGain: 0, btcTaxBase: 0 },
  );
}

/**
 * 세금 시뮬레이션 계산 — 서민형 ISA 계좌 기반
 *
 * ISA는 만기·해지 때 계좌 전체 기간의 순이익으로 한 번 정산한다:
 * 1. 과세 대상 = 해외지수·금현물 ETF 매매손익(이익·손실 통산) + 분배금(배당). 손실은 배당과도 통산
 * 2. 국내주식·국내주식형 ETF 매매손익은 제외 — 이익은 비과세, 손실 통산 여부는 불확실해 보수적으로 넣지 않음
 * 3. 순이익 400만원(서민형)/200만원(일반형)까지 비과세, 초과분 9.9% 분리과세
 * 4. BTC 등 ISA 밖 자산은 연도별 과세 (250만원 공제 후 22%, 2027년 귀속분부터)
 *
 * @param year 생략하면 전체 기간 누적(기본, ISA 정산 기준). 지정하면 그해 매도·배당만 집계
 */
export function calculateTaxSimulation(
  records: InvestmentRecord[],
  dividends: DividendRecord[],
  year?: number,
  isaType: IsaType = 'common',
): TaxSimulation {
  const inPeriod = (date: string): boolean => year == null || (date || '').startsWith(String(year));

  // 평균 단가는 전체 기록으로(이동평균), 손익은 대상 기간 매도만 집계
  // (기간 내 기록만 쓰면 과거에 산 종목의 취득원가가 0으로 잡혀 세금이 부풀려짐)
  const realizedPnl = calculateRealizedPnl(records, year);

  // ─── ISA 계좌 내 (손익통산) ───
  // 해외지수·금 ETF 매매 순손익 (음수 가능)
  const isaNetGain = TAXABLE_GAIN_KEYS.reduce((sum, key) => sum + (realizedPnl[key] ?? 0), 0);

  // 분배금(배당) — ISA 대상 자산 전부
  const isaDividend = dividends
    .filter((d) => inPeriod(d.date) && ISA_ELIGIBLE_KEYS.includes(d.asset_key))
    .reduce((sum, d) => sum + Number(d.amount ?? 0), 0);

  // ISA 총 순이익 = 매매 순손익 + 배당 (손실이 더 크면 0)
  const isaTotalProfit = Math.max(0, isaNetGain + isaDividend);

  // ISA 비과세/과세 계산
  const taxFreeLimit = ISA_TAX_FREE_LIMIT[isaType];
  const isaTaxFreeAmount = Math.min(isaTotalProfit, taxFreeLimit);
  const isaTaxableAmount = Math.max(0, isaTotalProfit - taxFreeLimit);
  const isaTax = Math.round(isaTaxableAmount * ISA_SEPARATED_TAX_RATE);
  const isaTaxFreeRemaining = Math.max(0, taxFreeLimit - isaTotalProfit);

  // ISA 절세 효과: 일반과세였다면 냈을 세금 - ISA로 낸 세금
  // 일반계좌에서 실제로 과세되는 것만 비교 대상 — 해외지수·금현물 ETF 매매차익 + 배당.
  // (국내주식형 ETF·국내주식 매매차익은 일반계좌에서도 비과세, 손익통산도 없으므로 이익만 합산)
  const taxableGainWithoutIsa = TAXABLE_GAIN_KEYS.reduce(
    (sum, key) => sum + Math.max(0, realizedPnl[key] ?? 0),
    0,
  );
  const taxWithoutIsa = Math.round(
    (taxableGainWithoutIsa + isaDividend) * DIVIDEND_TAX_RATE,
  );
  const isaSavings = Math.max(0, taxWithoutIsa - isaTax);

  // ─── ISA 밖 (BTC 등) — 연도별 ───
  const { btcGain, btcTaxBase } = cryptoTaxBase(records, year);
  const btcTax = Math.round(btcTaxBase * FOREIGN_TAX_RATE);

  return {
    isaNetGain,
    isaDividend,
    isaTotalProfit,
    isaTaxFreeLimit: taxFreeLimit,
    isaTaxFreeAmount,
    isaTaxableAmount,
    isaTax,
    isaTaxFreeRemaining,
    btcGain,
    btcTaxBase,
    btcTax,
    totalEstimatedTax: isaTax + btcTax,
    isaSavings,
  };
}

/** ISA 만기 정산 추정 (지금 전부 정리한다면) */
export type IsaProjection = {
  /** 실현분: 해외지수·금 ETF 실현 순손익 + 분배금 (음수 가능) */
  realizedTaxable: number;
  /** 미실현분: 해외지수·금 ETF (현재가 − 평균단가) × 보유수량 합 (음수 가능) */
  unrealizedTaxable: number;
  /** 실현 + 미실현 순이익 (0 이상) */
  totalTaxable: number;
  taxFreeLimit: number;
  /** 남은 비과세 한도 */
  taxFreeRemaining: number;
  /** 지금 전부 정리하면 낼 세금 (한도 초과분 × 9.9%) */
  estimatedTaxIfRealizedNow: number;
};

/**
 * ISA 만기 정산 추정 — 실현 손익(누적)에 보유분 평가손익을 더해 통산한다.
 * 평균단가는 calculateRealizedPnl과 같은 이동평균법.
 * 현재가가 없는(0 이하) 종목은 미실현분에서 빠진다.
 */
export function calculateIsaProjection(
  records: InvestmentRecord[],
  dividends: DividendRecord[],
  livePrices: Record<string, number>,
  isaType: IsaType = 'common',
): IsaProjection {
  const realized = calculateTaxSimulation(records, dividends, undefined, isaType);
  const realizedTaxable = realized.isaNetGain + realized.isaDividend;

  const avgCost = averageBuyCosts(records);
  const netQty = (key: string): number =>
    records
      .filter((r) => r.asset_key === key)
      .reduce((sum, r) => sum + (r.type === 'sell' ? -1 : 1) * getRecordQty(r), 0);

  const unrealizedTaxable = TAXABLE_GAIN_KEYS.reduce((sum, key) => {
    const price = Number(livePrices[key]);
    const qty = netQty(key);
    if (!Number.isFinite(price) || price <= 0 || qty <= 0) return sum;
    return sum + (price - (avgCost[key] ?? 0)) * qty;
  }, 0);

  const totalTaxable = Math.max(0, realizedTaxable + unrealizedTaxable);
  const taxFreeLimit = ISA_TAX_FREE_LIMIT[isaType];
  return {
    realizedTaxable,
    unrealizedTaxable,
    totalTaxable,
    taxFreeLimit,
    taxFreeRemaining: Math.max(0, taxFreeLimit - totalTaxable),
    estimatedTaxIfRealizedNow: Math.round(
      Math.max(0, totalTaxable - taxFreeLimit) * ISA_SEPARATED_TAX_RATE,
    ),
  };
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
/**
 * 입금 흐름을 조정한 수익률 지수 시계열 (시간가중, 기준값 1).
 * 적립식에서 신규 입금이 피크를 끌어올려 낙폭(MDD)을 가리는 왜곡을 제거:
 * r_i = (V_i - 입금_i - V_{i-1}) / V_{i-1} 로 월별 수익률을 연결한다.
 */
export function buildFlowAdjustedIndex(
  points: { principal: number; investment: number }[],
): number[] {
  const index: number[] = [];
  let level = 1;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      const prev = Number(points[i - 1].investment) || 0;
      const cur = Number(points[i].investment) || 0;
      const deposit =
        (Number(points[i].principal) || 0) - (Number(points[i - 1].principal) || 0);
      if (prev > 0) {
        const r = (cur - deposit - prev) / prev;
        if (Number.isFinite(r)) level *= 1 + r;
      }
    }
    index.push(level);
  }
  return index;
}

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

// ─── 벤치마크 비교 시뮬레이션 ───

/** 벤치마크 정의 — weights: 시세 키 → 비중 (합 1) */
export type BenchmarkDef = {
  key: string;
  label: string;
  weights: Readonly<Record<string, number>>;
  color: string;
};

/**
 * 벤치마크: S&P500만 / S&P500 70 + 나스닥100 30.
 * 나스닥100은 상장 이력이 가장 긴 TIGER 미국나스닥100(133690, 'nasdaq') 시세를 쓴다.
 */
export const BENCHMARKS: readonly BenchmarkDef[] = [
  { key: 'bm_snp', label: 'S&P500만', weights: { snp: 1 }, color: '#3b82f6' },
  { key: 'bm_7030', label: 'S&P500 70 / 나스닥100 30', weights: { snp: 0.7, nasdaq: 0.3 }, color: '#8b5cf6' },
];

type PriceMap = Readonly<Record<string, number>>;

/** 0 초과 유한 가격만 남긴 맵 */
function validPrices(source: Readonly<Record<string, unknown>>, keys: readonly string[]): Record<string, number> {
  return Object.fromEntries(
    keys
      .map((k) => [k, Number(source[k])] as const)
      .filter(([, p]) => Number.isFinite(p) && p > 0),
  );
}

/**
 * 벤치마크 가상 계좌 — 입금액을 비중대로 나눠 산다.
 * 그 시점 가격이 없는 종목 몫은 현금으로 들고 있다가(액면 평가) 가격이 생기는 첫 달에 산다.
 */
function createBenchmarkBook(weights: PriceMap) {
  const keys = Object.keys(weights);
  const units = new Map<string, number>();
  const pending = new Map<string, number>();
  return {
    deposit(amount: number): void {
      for (const k of keys) pending.set(k, (pending.get(k) ?? 0) + amount * weights[k]);
    },
    /** 이번 시점 가격으로 대기 현금 매수 (가격 없는 종목은 계속 대기) */
    settle(prices: PriceMap): void {
      for (const k of keys) {
        const cash = pending.get(k) ?? 0;
        const p = prices[k] ?? 0;
        if (cash > 0 && p > 0) {
          units.set(k, (units.get(k) ?? 0) + cash / p);
          pending.set(k, 0);
        }
      }
    },
    /** 평가액 = 보유수량 × 마지막 유효 가격 + 대기 현금 */
    value(markPrices: PriceMap): number {
      return keys.reduce(
        (sum, k) => sum + (units.get(k) ?? 0) * (markPrices[k] ?? 0) + (pending.get(k) ?? 0),
        0,
      );
    },
  };
}

/** 누적 원금(principal) 차분 → 월별 입금액 (원금이 늘어난 달만) */
function monthlyDeposits(sortedChart: readonly { date: string; principal: number }[]): Map<string, number> {
  const deposits = new Map<string, number>();
  let prevPrincipal = 0;
  for (const ch of sortedChart) {
    const monthDeposit = ch.principal - prevPrincipal;
    if (monthDeposit > 0) deposits.set(ch.date.substring(0, 7), monthDeposit);
    prevPrincipal = ch.principal;
  }
  return deposits;
}

/** 내 포트폴리오 + 벤치마크 최종 성과 (수익률 높은 순) */
function summarizeBenchmarks(lastPoint: BenchmarkPoint | undefined): BenchmarkResult[] {
  const totalPrincipal = Number(lastPoint?.principal ?? 0);
  const totalReturnOf = (v: number): number =>
    totalPrincipal > 0 ? (v / totalPrincipal - 1) * 100 : 0;
  const myValue = Number(lastPoint?.myPortfolio ?? 0);
  const results: BenchmarkResult[] = [
    { key: 'myPortfolio', label: '내 포트폴리오', finalValue: myValue, totalReturn: totalReturnOf(myValue), color: '#0f172a' },
    ...BENCHMARKS.map((bm) => {
      const v = Number(lastPoint?.[bm.key] ?? 0);
      return { key: bm.key, label: bm.label, finalValue: v, totalReturn: totalReturnOf(v), color: bm.color };
    }),
  ];
  return results.sort((a, b) => b.totalReturn - a.totalReturn);
}

/**
 * 벤치마크 대비 수익률 비교 계산
 *
 * 핵심: "같은 달에 같은 금액을 [벤치마크]에 넣었다면?"
 * - 입금 시점·금액: chartHistory 누적 원금(principal)의 월별 증가분
 * - 매수 시세: 해당 월 시세, 히스토리에 없는 달은 실시간 시세
 * - 벤치마크 종목 가격이 없는 달의 입금은 현금으로 대기 → 첫 유효 가격 달에 매수
 *
 * @param _records - 미사용 (하위호환)
 * @param chartHistory - 내 포트폴리오 월별 가치 [{date, principal, investment}]
 * @param marketHistory - 전체 월별 시세 [{d, snp, nasdaq, ...}]
 * @param livePrices - 실시간 시세
 * @param now - 기준 시각 (이번 달은 KST로 판정)
 */
export function calculateBenchmarkComparison(
  _records: InvestmentRecord[],
  chartHistory: { date: string; principal: number; investment: number }[],
  marketHistory: Record<string, unknown>[],
  livePrices: Record<string, number>,
  now: Date = new Date(),
): { points: BenchmarkPoint[]; results: BenchmarkResult[] } {
  if (chartHistory.length === 0 || marketHistory.length === 0) {
    return { points: [], results: [] };
  }

  const priceKeys = Array.from(new Set(BENCHMARKS.flatMap((bm) => Object.keys(bm.weights))));
  const priceByMonth = new Map(
    marketHistory
      .map((row) => [String(row.d ?? ''), validPrices(row, priceKeys)] as const)
      .filter(([d]) => d.length > 0),
  );
  const sortedChart = [...chartHistory].sort((a, b) => a.date.localeCompare(b.date));
  const depositByMonth = monthlyDeposits(sortedChart);
  const myDataByMonth = new Map(chartHistory.map((ch) => [ch.date, ch]));

  // 차트 범위: chartHistory 시작점(또는 첫 입금 월 중 빠른 쪽)부터
  const allMonths = Array.from(priceByMonth.keys()).filter((d) => d.length >= 7).sort();
  const firstDepositMonth = Array.from(depositByMonth.keys()).sort()[0];
  if (!firstDepositMonth || allMonths.length === 0) {
    return { points: [], results: [] };
  }
  const chartStartMonth = sortedChart[0].date.substring(0, 7);
  const startMonth = chartStartMonth < firstDepositMonth ? chartStartMonth : firstDepositMonth;
  const relevantMonths = allMonths.filter((m) => m.substring(0, 7) >= startMonth);

  const books = BENCHMARKS.map((bm) => createBenchmarkBook(bm.weights));
  let markPrices: Record<string, number> = {}; // 종목별 마지막 유효 가격 (평가용)
  let cumulativeDeposit = 0;
  const bookValues = (): Record<string, number> =>
    Object.fromEntries(BENCHMARKS.map((bm, i) => [bm.key, books[i].value(markPrices)]));

  const points: BenchmarkPoint[] = [];
  for (const ym of relevantMonths) {
    const deposit = depositByMonth.get(ym) ?? 0;
    cumulativeDeposit += deposit;
    const monthPrices = priceByMonth.get(ym) ?? {};
    markPrices = { ...markPrices, ...monthPrices };
    for (const book of books) {
      if (deposit > 0) book.deposit(deposit);
      book.settle(monthPrices);
    }
    const myData = myDataByMonth.get(ym);
    points.push({
      date: ym,
      myPortfolio: myData?.investment ?? (cumulativeDeposit > 0 ? cumulativeDeposit : 0),
      principal: myData?.principal ?? cumulativeDeposit,
      ...bookValues(),
    });
  }

  // ── 히스토리에 없는 월의 입금 (실시간 시세로 매수, 없으면 대기 현금) ──
  const live = validPrices(livePrices ?? {}, priceKeys);
  const lastHistoryMonth = relevantMonths[relevantMonths.length - 1] ?? '';
  const remainingMonths = Array.from(depositByMonth.keys())
    .filter((ym) => ym > lastHistoryMonth.substring(0, 7))
    .sort();
  for (const ym of remainingMonths) {
    const deposit = depositByMonth.get(ym) ?? 0;
    cumulativeDeposit += deposit;
    for (const book of books) {
      book.deposit(deposit);
      book.settle(live);
    }
  }

  // ── 마지막 포인트: 실시간 시세 기준 "오늘" ──
  if (livePrices) {
    markPrices = { ...markPrices, ...live };
    for (const book of books) book.settle(live);
    const currentYM = currentYearMonth(now);
    const lastChart = sortedChart[sortedChart.length - 1];
    // 총 입금액 = chartHistory 마지막 principal
    const totalDeposit = lastChart?.principal ?? cumulativeDeposit;
    const todayPoint: BenchmarkPoint = {
      date: currentYM,
      myPortfolio: lastChart?.investment ?? totalDeposit,
      principal: totalDeposit,
      ...bookValues(),
    };
    if (points.length > 0 && points[points.length - 1].date === currentYM) {
      points[points.length - 1] = todayPoint;
    } else {
      points.push(todayPoint);
    }
  }

  return { points, results: summarizeBenchmarks(points[points.length - 1]) };
}
