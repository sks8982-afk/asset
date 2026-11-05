import { ASSETS, keysByTaxClass } from './assets';

export const STORAGE_KEYS = {
  dark: 'asset-tracker-dark',
  /** 월 적립 금액의 이 기기 값 — DB 설정(app_settings)이 우선 (lib/settings) */
  budget: 'asset-tracker-budget',
  /** 목표 자산의 이 기기 값 — DB 설정이 우선 */
  goalAsset: 'asset-tracker-goal-asset',
  goalAssetShown: 'asset-tracker-goal-asset-shown',
  /** CMA 이율의 이 기기 값 — DB 설정이 우선 */
  cmaRate: 'asset-tracker-cma-rate',
} as const;

/** 자산 키 → 이름 (자산 정의 + 현금) */
export const NAMES: Record<string, string> = {
  ...Object.fromEntries(ASSETS.map((a) => [a.key, a.name])),
  cash: '현금(CMA)',
};

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
