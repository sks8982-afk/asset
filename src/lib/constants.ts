import type { AssetMarketGroup, RatioPreset } from './types';
import { ASSETS, keysByTaxClass } from './assets';

export const STORAGE_KEYS = {
  dark: 'asset-tracker-dark',
  ratios: 'asset-tracker-ratios',
  budget: 'asset-tracker-budget',
  goalRoi: 'asset-tracker-goal-roi',
  goalAsset: 'asset-tracker-goal-asset',
  goalRoiShown: 'asset-tracker-goal-roi-shown',
  goalAssetShown: 'asset-tracker-goal-asset-shown',
  cmaRate: 'asset-tracker-cma-rate',
  rebalancingAlertQuarter: 'asset-tracker-rebalancing-alert-quarter',
} as const;

export const COLORS = [
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#f59e0b',
  '#94a3b8',
  '#10b981',
  '#f43f5e',
  '#0ea5e9',
  '#84cc16',
  '#ec4899',
  '#8b5cf6',
];

/** 자산 키 → 이름 (자산 정의 + 현금) */
export const NAMES: Record<string, string> = {
  ...Object.fromEntries(ASSETS.map((a) => [a.key, a.name])),
  cash: '현금(CMA)',
};

export const DEFAULT_RATIOS: Record<string, number> = {
  tech10: 3,
  nasdaq: 3,
  nasdaq_kodex: 0,
  snp: 3,
  gold: 1,
  kodex200: 1,
  kodex_kosdaq150: 1,
  semiconductor_top10: 1,
  samsung: 1,
  cash: 1,
  btc: 1,
};

/** 국내(국장) vs 해외(미장) 구분 */
export const ASSET_MARKET_GROUPS: AssetMarketGroup[] = [
  { label: '국내(국장)', keys: keysByTaxClass('domestic_equity', 'gold_etf') },
  { label: '해외(미장)', keys: keysByTaxClass('foreign_etf') },
  { label: '기타', keys: ['cash', ...keysByTaxClass('crypto')] },
];

/** 해외 자산 키 목록 (세금 계산용) */
export const FOREIGN_ASSET_KEYS = keysByTaxClass('foreign_etf', 'crypto');

/** 국내 자산 키 목록 */
export const DOMESTIC_ASSET_KEYS = keysByTaxClass('domestic_equity', 'gold_etf');

/**
 * ISA 계좌 대상 자산 키 (국내 상장 ETF/주식만 — BTC 제외)
 * 배당(분배금)은 모두 ISA 과세 대상, 매매손익은 TAXABLE_GAIN_KEYS만 손익통산
 */
export const ISA_ELIGIBLE_KEYS = keysByTaxClass('foreign_etf', 'gold_etf', 'domestic_equity');

/** ISA 밖 자산 (BTC 등 — 별도 과세) */
export const NON_ISA_KEYS = keysByTaxClass('crypto');

/**
 * 매매차익이 과세(일반계좌 배당소득세 15.4%)되는 자산 — 해외지수·금현물 ETF.
 * ISA에서는 이 자산들의 손익만 통산한다. 국내주식형 ETF·국내주식 매매차익은 비과세라 제외.
 */
export const TAXABLE_GAIN_KEYS = keysByTaxClass('foreign_etf', 'gold_etf');

/** 비중 프리셋 */
export const RATIO_PRESETS: RatioPreset[] = [
  {
    name: '공격형',
    ratios: { tech10: 3, nasdaq: 3, nasdaq_kodex: 0, snp: 3, gold: 1, kodex200: 1, kodex_kosdaq150: 1, semiconductor_top10: 1, samsung: 1, cash: 0.5, btc: 1 },
  },
  {
    name: '균형',
    ratios: { tech10: 2, nasdaq: 2, nasdaq_kodex: 0, snp: 2, gold: 2, kodex200: 1, kodex_kosdaq150: 1, semiconductor_top10: 1, samsung: 1, cash: 2, btc: 1 },
  },
  {
    name: '보수형',
    ratios: { tech10: 2, nasdaq: 2, nasdaq_kodex: 0, snp: 2, gold: 2, kodex200: 1, kodex_kosdaq150: 1, semiconductor_top10: 1, samsung: 1, cash: 3, btc: 1 },
  },
];

/** 해외주식 양도소득세 공제한도 (ISA 밖 해외직투용 — BTC 등) */
export const FOREIGN_TAX_EXEMPTION = 2500000;

/** 해외주식 양도소득세율 (지방세 포함) */
export const FOREIGN_TAX_RATE = 0.22;

/** 가상자산 양도소득 과세 시행 연도 (2027-01-01 시행 예정, 그 전 귀속분은 비과세) */
export const CRYPTO_TAX_EFFECTIVE_YEAR = 2027;

/** 일반 배당소득세율 (15.4%) — ISA 밖에서 적용 */
export const DIVIDEND_TAX_RATE = 0.154;

// ─── 서민형 ISA 계좌 관련 ───

/** ISA 유형 */
export type IsaType = 'common' | 'general';

/** ISA 비과세 한도 (서민형 400만, 일반형 200만) */
export const ISA_TAX_FREE_LIMIT: Record<IsaType, number> = {
  common: 4_000_000,   // 서민형/농어민형
  general: 2_000_000,  // 일반형
};

/** ISA 초과분 분리과세율 (9.9%, 지방세 포함) */
export const ISA_SEPARATED_TAX_RATE = 0.099;

/** ISA 연간 납입한도 */
export const ISA_ANNUAL_DEPOSIT_LIMIT = 20_000_000;

/** ISA 의무가입기간 (년) */
export const ISA_MANDATORY_PERIOD_YEARS = 3;
