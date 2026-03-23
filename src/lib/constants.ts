import type { AssetMarketGroup, RatioPreset } from './types';

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

export const NAMES: Record<string, string> = {
  tech10: 'TIGER 미국테크TOP10 INDXX',
  nasdaq: 'TIGER 미국나스닥100',
  snp: 'TIGER 미국 S&P500',
  gold: 'TIGER 금은선물(H)',
  kodex200: 'KODEX 200',
  kodex_kosdaq150: 'KODEX 코스닥150',
  semiconductor_top10: 'TIGER 반도체TOP10',
  samsung: '삼성전자',
  cash: '현금(CMA)',
  btc: '비트코인',
};

export const DEFAULT_RATIOS: Record<string, number> = {
  tech10: 3,
  nasdaq: 3,
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
  { label: '국내(국장)', keys: ['samsung', 'kodex200', 'kodex_kosdaq150', 'semiconductor_top10', 'gold'] },
  { label: '해외(미장)', keys: ['tech10', 'nasdaq', 'snp'] },
  { label: '기타', keys: ['cash', 'btc'] },
];

/** 해외 자산 키 목록 (세금 계산용) */
export const FOREIGN_ASSET_KEYS = ['tech10', 'nasdaq', 'snp', 'btc'];

/** 국내 자산 키 목록 */
export const DOMESTIC_ASSET_KEYS = ['samsung', 'kodex200', 'kodex_kosdaq150', 'semiconductor_top10', 'gold'];

/**
 * ISA 계좌 대상 자산 키 (국내 상장 ETF/주식만 — BTC 제외)
 * ISA에서는 이 자산들의 매매차익+배당이 손익통산 후 비과세/분리과세 적용
 */
export const ISA_ELIGIBLE_KEYS = [
  'tech10', 'nasdaq', 'snp', 'gold',
  'kodex200', 'kodex_kosdaq150', 'semiconductor_top10', 'samsung',
];

/** ISA 밖 자산 (BTC 등 — 별도 과세) */
export const NON_ISA_KEYS = ['btc'];

/** 비중 프리셋 */
export const RATIO_PRESETS: RatioPreset[] = [
  {
    name: '공격형',
    ratios: { tech10: 3, nasdaq: 3, snp: 3, gold: 1, kodex200: 1, kodex_kosdaq150: 1, semiconductor_top10: 1, samsung: 1, cash: 0.5, btc: 1 },
  },
  {
    name: '균형',
    ratios: { tech10: 2, nasdaq: 2, snp: 2, gold: 2, kodex200: 1, kodex_kosdaq150: 1, semiconductor_top10: 1, samsung: 1, cash: 2, btc: 1 },
  },
  {
    name: '보수형',
    ratios: { tech10: 2, nasdaq: 2, snp: 2, gold: 2, kodex200: 1, kodex_kosdaq150: 1, semiconductor_top10: 1, samsung: 1, cash: 3, btc: 1 },
  },
];

/** DB 초기화 시 필요한 비밀번호 */
export const RESET_DB_PASSWORD = '134679';

/** 해외주식 양도소득세 공제한도 (ISA 밖 해외직투용 — BTC 등) */
export const FOREIGN_TAX_EXEMPTION = 2500000;

/** 해외주식 양도소득세율 (지방세 포함) */
export const FOREIGN_TAX_RATE = 0.22;

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
