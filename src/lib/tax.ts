/**
 * ISA 세금 — 계좌 전체 기간 손익통산(서민형 400만원 비과세, 초과분 9.9%)과 ISA 밖 가상자산 과세.
 */
import type { DividendRecord, InvestmentRecord, TaxSimulation } from './types';
import {
  CRYPTO_TAX_EFFECTIVE_YEAR, DIVIDEND_TAX_RATE, FOREIGN_TAX_EXEMPTION, FOREIGN_TAX_RATE,
  ISA_ELIGIBLE_KEYS, ISA_SEPARATED_TAX_RATE, ISA_TAX_FREE_LIMIT, NON_ISA_KEYS, TAXABLE_GAIN_KEYS,
  type IsaType,
} from './constants';
import { calculatePositions, calculateRealizedPnl, filterSellRecords, getRecordQty } from './utils';

/** 자산별 현재 이동평균 단가 */
function averageBuyCosts(records: InvestmentRecord[]): Record<string, number> {
  return Object.fromEntries(
    Object.entries(calculatePositions(records)).map(([key, p]) => [key, p.avgCost]),
  );
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
