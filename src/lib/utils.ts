import type {
  InvestmentRecord, MonthlyBudget, TaxSimulation, DividendRecord,
  AssetSignal, MarketSignal, SignalLevel,
  BenchmarkPoint, BenchmarkResult,
} from './types';
import type { IsaType } from './constants';
import {
  FOREIGN_TAX_EXEMPTION, FOREIGN_TAX_RATE, DIVIDEND_TAX_RATE,
  ISA_ELIGIBLE_KEYS, NON_ISA_KEYS, ISA_TAX_FREE_LIMIT, ISA_SEPARATED_TAX_RATE,
} from './constants';

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

/**
 * 세금 시뮬레이션 계산 — 서민형 ISA 계좌 기반
 *
 * ISA 계좌 핵심 규칙:
 * 1. ISA 대상 자산(국내 상장 ETF/주식)의 매매차익 + 배당을 모두 합산
 * 2. **손익통산**: 이익에서 손실을 빼서 순이익 산출
 * 3. 순이익 400만원(서민형)까지 비과세
 * 4. 초과분은 9.9% 분리과세 (일반 15.4% 대비 유리)
 * 5. BTC 등 ISA 불가 자산은 별도 과세 (250만원 공제 후 22%)
 */
export function calculateTaxSimulation(
  records: InvestmentRecord[],
  dividends: DividendRecord[],
  year?: number,
  isaType: IsaType = 'common',
): TaxSimulation {
  const targetYear = year ?? new Date().getFullYear();
  const yearStr = String(targetYear);

  const yearRecords = records.filter((r) => r.date.startsWith(yearStr));
  const realizedPnl = calculateRealizedPnl(yearRecords);

  // ─── ISA 계좌 내 (손익통산) ───
  // ISA 대상 자산의 이익과 손실을 각각 합산
  let isaGains = 0;
  let isaLosses = 0;
  for (const key of ISA_ELIGIBLE_KEYS) {
    const pnl = realizedPnl[key] ?? 0;
    if (pnl > 0) isaGains += pnl;
    else isaLosses += Math.abs(pnl);
  }
  // 손익통산: 이익 - 손실 = 순이익
  const isaNetGain = Math.max(0, isaGains - isaLosses);

  // ISA 내 배당 (ISA 대상 자산의 배당만)
  const yearDividends = dividends.filter((d) => d.date.startsWith(yearStr));
  const isaDividend = yearDividends
    .filter((d) => ISA_ELIGIBLE_KEYS.includes(d.asset_key))
    .reduce((sum, d) => sum + d.amount, 0);

  // ISA 총 순이익 = 매매 순이익 + 배당
  const isaTotalProfit = isaNetGain + isaDividend;

  // ISA 비과세/과세 계산
  const taxFreeLimit = ISA_TAX_FREE_LIMIT[isaType];
  const isaTaxFreeAmount = Math.min(isaTotalProfit, taxFreeLimit);
  const isaTaxableAmount = Math.max(0, isaTotalProfit - taxFreeLimit);
  const isaTax = Math.round(isaTaxableAmount * ISA_SEPARATED_TAX_RATE);
  const isaTaxFreeRemaining = Math.max(0, taxFreeLimit - isaTotalProfit);

  // ISA 절세 효과: 일반과세였다면 냈을 세금 - ISA로 낸 세금
  const taxWithoutIsa = Math.round(isaTotalProfit * DIVIDEND_TAX_RATE); // 일반이면 15.4%
  const isaSavings = Math.max(0, taxWithoutIsa - isaTax);

  // ─── ISA 밖 (BTC 등) ───
  const btcGain = NON_ISA_KEYS.reduce(
    (sum, key) => sum + Math.max(0, realizedPnl[key] ?? 0),
    0,
  );
  const btcTaxBase = Math.max(0, btcGain - FOREIGN_TAX_EXEMPTION);
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

// ─── 벤치마크 비교 시뮬레이션 ───

/** 벤치마크 정의 */
export const BENCHMARKS = [
  { key: 'bm_snp',     label: 'S&P500 올인',        priceKey: 'snp',     color: '#3b82f6' },
  { key: 'bm_nasdaq',  label: '나스닥100 올인',     priceKey: 'nasdaq',  color: '#8b5cf6' },
  { key: 'bm_kodex',   label: 'KODEX200 올인',      priceKey: 'kodex200', color: '#ef4444' },
  { key: 'bm_gold',    label: '금 올인',            priceKey: 'gold',    color: '#f59e0b' },
  { key: 'bm_6040',    label: 'S&P 60 / 금 40',    priceKey: '__6040__', color: '#10b981' },
] as const;

/**
 * 벤치마크 대비 수익률 비교 계산
 *
 * "같은 금액을 같은 시점에 입금했는데, 전부 [벤치마크]만 샀다면?"
 *
 * @param budgets - 실제 월별 입금 내역
 * @param chartHistory - 내 포트폴리오 월별 가치 [{date, principal, investment}]
 * @param marketHistory - 전체 월별 시세 [{d, snp, nasdaq, kodex200, gold, ...}]
 * @param livePrices - 실시간 시세
 */
export function calculateBenchmarkComparison(
  budgets: MonthlyBudget[],
  chartHistory: { date: string; principal: number; investment: number }[],
  marketHistory: Record<string, unknown>[],
  livePrices: Record<string, number>,
): { points: BenchmarkPoint[]; results: BenchmarkResult[] } {
  if (chartHistory.length === 0 || budgets.length === 0) {
    return { points: [], results: [] };
  }

  // 월별 시세를 date 기준 맵으로 변환
  const priceByMonth: Record<string, Record<string, number>> = {};
  for (const row of marketHistory) {
    const d = String(row.d ?? '');
    if (!d) continue;
    const prices: Record<string, number> = {};
    for (const bm of BENCHMARKS) {
      if (bm.priceKey === '__6040__') continue;
      prices[bm.priceKey] = Number(row[bm.priceKey]) || 0;
    }
    priceByMonth[d] = prices;
  }

  // 입금을 YYYY-MM 기준으로 합산
  const depositByMonth: Record<string, number> = {};
  for (const b of budgets) {
    const ym = b.month_date.substring(0, 7);
    depositByMonth[ym] = (depositByMonth[ym] ?? 0) + Number(b.amount ?? 0);
  }

  // 벤치마크별 누적 보유수량 추적
  const holdings: Record<string, number> = {};
  // 60/40은 두 자산의 수량을 별도 추적
  let holdings6040Snp = 0;
  let holdings6040Gold = 0;

  for (const bm of BENCHMARKS) {
    if (bm.priceKey !== '__6040__') holdings[bm.key] = 0;
  }

  const points: BenchmarkPoint[] = [];

  for (const ch of chartHistory) {
    const ym = ch.date;
    const deposit = depositByMonth[ym] ?? 0;
    const monthPrices = priceByMonth[ym];

    // 이번 달 입금으로 벤치마크 매수
    if (deposit > 0 && monthPrices) {
      for (const bm of BENCHMARKS) {
        if (bm.priceKey === '__6040__') {
          // 60% S&P, 40% Gold
          const snpPrice = monthPrices['snp'] || 0;
          const goldPrice = monthPrices['gold'] || 0;
          if (snpPrice > 0) holdings6040Snp += (deposit * 0.6) / snpPrice;
          if (goldPrice > 0) holdings6040Gold += (deposit * 0.4) / goldPrice;
        } else {
          const price = monthPrices[bm.priceKey] || 0;
          if (price > 0) holdings[bm.key] += deposit / price;
        }
      }
    }

    // 현재 평가액 계산 (해당 월 시세 기준)
    const point: BenchmarkPoint = {
      date: ym,
      myPortfolio: ch.investment,
      principal: ch.principal,
    };

    for (const bm of BENCHMARKS) {
      if (bm.priceKey === '__6040__') {
        const snpP = monthPrices?.['snp'] || 0;
        const goldP = monthPrices?.['gold'] || 0;
        point[bm.key] = holdings6040Snp * snpP + holdings6040Gold * goldP;
      } else {
        const price = monthPrices?.[bm.priceKey] || 0;
        point[bm.key] = holdings[bm.key] * price;
      }
    }

    points.push(point);
  }

  // 마지막 포인트를 실시간 시세로 보정
  if (points.length > 0 && livePrices) {
    const last = { ...points[points.length - 1] };
    for (const bm of BENCHMARKS) {
      if (bm.priceKey === '__6040__') {
        const snpLive = livePrices['snp'] || 0;
        const goldLive = livePrices['gold'] || 0;
        last[bm.key] = holdings6040Snp * snpLive + holdings6040Gold * goldLive;
      } else {
        const liveP = livePrices[bm.priceKey] || 0;
        if (liveP > 0) last[bm.key] = holdings[bm.key] * liveP;
      }
    }
    points[points.length - 1] = last;
  }

  // 최종 성과 요약
  const lastPoint = points[points.length - 1];
  const totalPrincipal = lastPoint?.principal ?? 0;

  const results: BenchmarkResult[] = [
    {
      key: 'myPortfolio',
      label: '내 포트폴리오',
      finalValue: Number(lastPoint?.myPortfolio ?? 0),
      totalReturn: totalPrincipal > 0
        ? (Number(lastPoint?.myPortfolio ?? 0) / totalPrincipal - 1) * 100
        : 0,
      color: '#0f172a',
    },
    ...BENCHMARKS.map((bm) => ({
      key: bm.key,
      label: bm.label,
      finalValue: Number(lastPoint?.[bm.key] ?? 0),
      totalReturn: totalPrincipal > 0
        ? (Number(lastPoint?.[bm.key] ?? 0) / totalPrincipal - 1) * 100
        : 0,
      color: bm.color,
    })),
  ];

  // 수익률 높은 순 정렬
  results.sort((a, b) => b.totalReturn - a.totalReturn);

  return { points, results };
}

// ─── 매수 시그널 시스템 (백테스팅 기반) ───

/** 시그널 레벨별 설정 */
const SIGNAL_LEVELS: { level: SignalLevel; min: number; label: string; multiplier: number }[] = [
  { level: 'all_in',      min: 76, label: '🔴 올인',     multiplier: 2.5 },
  { level: 'strong_buy',  min: 56, label: '🟠 적극매수', multiplier: 1.8 },
  { level: 'opportunity', min: 36, label: '🟡 매수기회', multiplier: 1.3 },
  { level: 'watch',       min: 16, label: '🔵 관심',     multiplier: 1.0 },
  { level: 'normal',      min: 0,  label: '🟢 정상',     multiplier: 1.0 },
];

/** 점수 → 시그널 레벨 변환 */
function scoreToLevel(score: number): { level: SignalLevel; multiplier: number } {
  const clamped = Math.max(0, Math.min(100, score));
  for (const sl of SIGNAL_LEVELS) {
    if (clamped >= sl.min) return { level: sl.level, multiplier: sl.multiplier };
  }
  return { level: 'normal', multiplier: 1.0 };
}

/** 시그널 레벨 한국어 라벨 */
export function getSignalLabel(level: SignalLevel): string {
  return SIGNAL_LEVELS.find((sl) => sl.level === level)?.label ?? '🟢 정상';
}

// ─── 자산별 위험 프로파일 ───
//
// 30년 애널리스트 관점: 같은 -20%라도 자산마다 의미가 완전히 다르다.
// - S&P500 -20% = 역사적 대폭락 (2008, 2020) → 강력 매수 시그널
// - 비트코인 -20% = 흔한 조정 (연 3-4회 발생) → 아직 관망
// - 금 -10% = 안전자산 치고 큰 하락 → 의미있는 시그널
//
// 각 자산의 역사적 변동성에 맞게 임계값을 다르게 설정한다.

type AssetRiskCategory = 'safe_haven' | 'standard' | 'growth' | 'single_stock' | 'crypto';

type RiskProfile = {
  category: AssetRiskCategory;
  label: string;
  /** 낙폭 임계값: [최소%, 점수][] — 큰 것부터 매칭 */
  drawdownTiers: [number, number, string][];
  /** MA 괴리율 기준 배수 (1.0 = 기본, 2.0 = 2배 넓은 기준) */
  maScale: number;
  /** 연속 하락 의미 있는 최소 개월수 */
  momentumMinMonths: number;
  /** 최대 점수 상한 (자동으로 이 이상 안 감) */
  scoreCap: number;
};

const RISK_PROFILES: Record<AssetRiskCategory, RiskProfile> = {
  // 금: 변동성 낮은 안전자산 → 작은 하락도 의미 크다
  safe_haven: {
    category: 'safe_haven',
    label: '안전자산',
    drawdownTiers: [
      [25, 55, '대폭락'],
      [18, 45, '급락'],
      [12, 35, '조정'],
      [8,  25, ''],
      [3,  10, ''],
    ],
    maScale: 0.7,
    momentumMinMonths: 2,
    scoreCap: 85,
  },
  // S&P500, KODEX200: 지수 ETF → 평균회귀 강함, 기본 기준
  standard: {
    category: 'standard',
    label: '지수 ETF',
    drawdownTiers: [
      [30, 55, '대폭락'],
      [20, 45, '급락'],
      [15, 35, '조정'],
      [10, 25, ''],
      [5,  10, ''],
    ],
    maScale: 1.0,
    momentumMinMonths: 3,
    scoreCap: 100,
  },
  // 나스닥, 테크TOP10, 반도체, 코스닥: 성장주/테마 → 변동 큼
  growth: {
    category: 'growth',
    label: '성장/테마',
    drawdownTiers: [
      [35, 55, '대폭락'],
      [25, 40, '급락'],
      [18, 30, '조정'],
      [12, 20, ''],
      [7,  10, ''],
    ],
    maScale: 1.3,
    momentumMinMonths: 3,
    scoreCap: 100,
  },
  // 삼성전자: 개별 종목 → 종목 고유 리스크 있음
  single_stock: {
    category: 'single_stock',
    label: '개별종목',
    drawdownTiers: [
      [40, 55, '대폭락'],
      [30, 40, '급락'],
      [20, 30, '조정'],
      [12, 20, ''],
      [7,  10, ''],
    ],
    maScale: 1.5,
    momentumMinMonths: 3,
    scoreCap: 90,
  },
  // 비트코인: 극단적 변동성 → 기준을 대폭 높여야 함
  crypto: {
    category: 'crypto',
    label: '암호화폐',
    drawdownTiers: [
      [65, 55, '대폭락'],
      [50, 40, '급락'],
      [35, 30, '조정'],
      [25, 20, ''],
      [15, 10, ''],
    ],
    maScale: 2.5,
    momentumMinMonths: 4,
    scoreCap: 75, // 암호화폐는 올인 불가 — 최대 적극매수까지만
  },
};

/** 자산 키 → 위험 프로파일 매핑 */
const ASSET_RISK_MAP: Record<string, AssetRiskCategory> = {
  snp: 'standard',
  kodex200: 'standard',
  nasdaq: 'growth',
  tech10: 'growth',
  kodex_kosdaq150: 'growth',
  semiconductor_top10: 'growth',
  samsung: 'single_stock',
  gold: 'safe_haven',
  btc: 'crypto',
};

/** 자산의 위험 프로파일 조회 */
export function getAssetRiskProfile(key: string): RiskProfile {
  const category = ASSET_RISK_MAP[key] ?? 'standard';
  return RISK_PROFILES[category];
}

/**
 * 개별 자산 시그널 계산 (자산별 위험 프로파일 반영)
 *
 * @param prices - 월별 가격 배열 (오래된 것 → 최신 순서, 최소 3개월)
 * @param currentPrice - 실시간 현재가
 * @param key - 자산 키
 *
 * 채점 기준 (백테스팅 검증, 자산별 차등 적용):
 * 1. 고점 대비 낙폭 (Drawdown): 0-55점 — 자산별 임계값 상이
 * 2. 이동평균 괴리: 0-25점 — maScale로 기준 조정
 * 3. 연속 하락 모멘텀: 0-15점 — momentumMinMonths로 기준 조정
 * 4. 점수 상한: scoreCap으로 제한 (BTC는 75점 상한)
 */
export function calculateAssetSignal(
  prices: number[],
  currentPrice: number,
  key: string,
): AssetSignal {
  const profile = getAssetRiskProfile(key);
  const reasons: string[] = [];

  // ── 1. 고점 대비 낙폭 (최근 12개월 고점 기준) ──
  const recentPrices = prices.slice(-12);
  const peak12m = Math.max(...recentPrices, currentPrice);
  const drawdownFromPeak = peak12m > 0
    ? ((peak12m - currentPrice) / peak12m) * 100
    : 0;

  let drawdownScore = 0;
  for (const [threshold, score, label] of profile.drawdownTiers) {
    if (drawdownFromPeak >= threshold) {
      drawdownScore = score;
      if (label) {
        reasons.push(`고점 대비 -${drawdownFromPeak.toFixed(1)}% (${label})`);
      } else if (drawdownFromPeak >= 10) {
        reasons.push(`고점 대비 -${drawdownFromPeak.toFixed(1)}%`);
      }
      break;
    }
  }

  // ── 2. 이동평균 괴리율 (maScale로 자산별 기준 조정) ──
  const s = profile.maScale; // 기준 배수
  const ma6Prices = prices.slice(-6);
  const ma6 = ma6Prices.length >= 3
    ? ma6Prices.reduce((sum, p) => sum + p, 0) / ma6Prices.length
    : 0;
  const maBelowPct6 = ma6 > 0 ? ((ma6 - currentPrice) / ma6) * 100 : 0;

  const ma12Prices = prices.slice(-12);
  const ma12 = ma12Prices.length >= 6
    ? ma12Prices.reduce((sum, p) => sum + p, 0) / ma12Prices.length
    : 0;
  const maBelowPct12 = ma12 > 0 ? ((ma12 - currentPrice) / ma12) * 100 : 0;

  let maScore = 0;
  // 6개월 MA 하회 (기준: 5% × maScale, 10% × maScale)
  if (maBelowPct6 > 10 * s) { maScore += 10; reasons.push(`6개월 평균 대비 -${maBelowPct6.toFixed(1)}% 하회`); }
  else if (maBelowPct6 > 5 * s) { maScore += 7; }
  else if (maBelowPct6 > 0) { maScore += 3; }

  // 12개월 MA 하회
  if (maBelowPct12 > 10 * s) { maScore += 15; reasons.push(`12개월 평균 대비 -${maBelowPct12.toFixed(1)}% 하회`); }
  else if (maBelowPct12 > 5 * s) { maScore += 10; reasons.push('12개월 평균 하회'); }
  else if (maBelowPct12 > 0) { maScore += 5; }

  // ── 3. 연속 하락 개월수 (자산별 최소 기준 적용) ──
  let consecutiveDeclines = 0;
  if (prices.length > 0 && currentPrice < prices[prices.length - 1]) {
    consecutiveDeclines++;
  }
  for (let i = prices.length - 1; i >= 1; i--) {
    if (prices[i] < prices[i - 1]) consecutiveDeclines++;
    else break;
  }

  let momentumScore = 0;
  const minM = profile.momentumMinMonths;
  if (consecutiveDeclines >= minM + 1) {
    momentumScore = 15;
    reasons.push(`${consecutiveDeclines}개월 연속 하락 (과매도)`);
  } else if (consecutiveDeclines >= minM) {
    momentumScore = 10;
    reasons.push(`${consecutiveDeclines}개월 연속 하락`);
  } else if (consecutiveDeclines >= minM - 1 && consecutiveDeclines >= 2) {
    momentumScore = 5;
  }

  // ── 총점 (scoreCap으로 자산별 상한 적용) ──
  const rawScore = drawdownScore + maScore + momentumScore;
  const totalScore = Math.min(profile.scoreCap, rawScore);
  const { level, multiplier } = scoreToLevel(totalScore);

  // 프로파일 정보를 이유에 추가 (상한 적용 시)
  if (rawScore > profile.scoreCap) {
    reasons.push(`${profile.label} 상한 ${profile.scoreCap}점 적용 (원점수 ${rawScore})`);
  }

  return {
    key,
    score: totalScore,
    level,
    multiplier,
    drawdownFromPeak,
    drawdownScore,
    maBelowPct6,
    maBelowPct12,
    maScore,
    consecutiveDeclines,
    momentumScore,
    reasons,
  };
}

/**
 * 전체 시장 시그널 계산
 *
 * @param marketHistory - 월별 시세 배열 [{d: 'YYYY-MM', tech10: 가격, ...}]
 * @param livePrices - 실시간 시세 {tech10: 가격, ...}
 * @param assetKeys - 분석 대상 자산 키 (cash 제외)
 */
export function calculateMarketSignal(
  marketHistory: Record<string, unknown>[],
  livePrices: Record<string, number>,
  assetKeys: string[],
): MarketSignal {
  const assetSignals: Record<string, AssetSignal> = {};
  const reasons: string[] = [];

  // 현재 미완료 월 제거 (Yahoo 월봉에 이번 달 미완료 데이터 포함됨)
  // → 완료된 월만 사용하고, 이번 달은 livePrices(실시간)로 대체
  const currentYM = new Date().toISOString().slice(0, 7);
  const completedHistory = marketHistory.filter(
    (row) => String(row.d ?? '') < currentYM,
  );

  // 자산별 시그널 계산
  for (const key of assetKeys) {
    if (key === 'cash') continue;
    const monthlyPrices = completedHistory
      .map((row) => Number(row[key]) || 0)
      .filter((p) => p > 0);

    const currentPrice = livePrices[key] ?? 0;
    if (monthlyPrices.length < 3 || currentPrice <= 0) continue;

    assetSignals[key] = calculateAssetSignal(monthlyPrices, currentPrice, key);
  }

  // 동시 하락 상관관계 보너스 (시스템 리스크 = 최고의 기회)
  const signalCount = Object.values(assetSignals)
    .filter((s) => s.level === 'opportunity' || s.level === 'strong_buy' || s.level === 'all_in')
    .length;

  let correlationScore = 0;
  if (signalCount >= 5) {
    correlationScore = 10;
    reasons.push(`${signalCount}개 자산 동시 매수 시그널 — 시스템 리스크 (역사적 최적 매수 구간)`);
  } else if (signalCount >= 3) {
    correlationScore = 5;
    reasons.push(`${signalCount}개 자산 동시 매수 시그널`);
  }

  // 전체 점수: 자산별 평균 + 상관관계 보너스
  const allScores = Object.values(assetSignals).map((s) => s.score);
  const avgScore = allScores.length > 0
    ? allScores.reduce((s, v) => s + v, 0) / allScores.length
    : 0;
  const overallScore = Math.min(100, Math.round(avgScore + correlationScore));
  const { level: overallLevel, multiplier: overallMultiplier } = scoreToLevel(overallScore);

  // 최고 시그널 자산 안내
  const topSignal = Object.values(assetSignals)
    .sort((a, b) => b.score - a.score)[0];
  if (topSignal && topSignal.score >= 36) {
    reasons.push(`최강 시그널: ${topSignal.key} (${topSignal.score}점)`);
  }

  return {
    overallScore,
    overallLevel,
    overallMultiplier,
    assetSignals,
    correlationScore,
    signalCount,
    reasons,
  };
}
