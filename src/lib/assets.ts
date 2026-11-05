/**
 * 자산 정의 — 종목 정보의 단일 출처.
 * key는 DB(investment_records.asset_key 등)에 저장된 값이므로 절대 바꾸지 않는다.
 */

/** core: 매달 적립하는 코어 / hold: 보유만 (매수 계산 제외) */
export type AssetRole = 'core' | 'hold';

/** 코어 묶음 — 같은 지수를 추종하는 종목은 한 묶음으로 비중을 계산 */
export type CoreGroup = 'sp500' | 'nasdaq100';

/**
 * 세금 분류 (ISA 기준)
 * - foreign_etf: 국내 상장 해외지수 ETF — 매매차익 과세 대상, 손익통산
 * - gold_etf: 금현물 ETF — 매매차익 과세 대상, 손익통산
 * - domestic_equity: 국내주식·국내주식형 ETF — 매매차익 비과세
 * - crypto: 가상자산 — ISA 밖
 */
export type TaxClass = 'foreign_etf' | 'gold_etf' | 'domestic_equity' | 'crypto';

/** 시세 통화 — USD 종목은 KRW=X 환율로 원화 환산 */
export type PriceCurrency = 'KRW' | 'USD';

export type AssetDef = {
  key: string;
  name: string;
  /** Yahoo Finance 심볼 */
  symbol: string;
  role: AssetRole;
  /** 코어 자산의 묶음 */
  group?: CoreGroup;
  /** 해당 묶음의 신규 매수 종목 */
  buyVehicle?: boolean;
  taxClass: TaxClass;
  currency: PriceCurrency;
  color: string;
};

export const ASSETS: readonly AssetDef[] = [
  { key: 'snp', name: 'TIGER 미국S&P500', symbol: '360750.KS', role: 'core', group: 'sp500', buyVehicle: true, taxClass: 'foreign_etf', currency: 'KRW', color: '#3b82f6' },
  { key: 'nasdaq', name: 'TIGER 미국나스닥100', symbol: '133690.KS', role: 'core', group: 'nasdaq100', taxClass: 'foreign_etf', currency: 'KRW', color: '#8b5cf6' },
  { key: 'nasdaq_kodex', name: 'KODEX 미국나스닥100', symbol: '379810.KS', role: 'core', group: 'nasdaq100', buyVehicle: true, taxClass: 'foreign_etf', currency: 'KRW', color: '#6366f1' },
  { key: 'tech10', name: 'TIGER 미국테크TOP10 INDXX', symbol: '381170.KS', role: 'hold', taxClass: 'foreign_etf', currency: 'KRW', color: '#0ea5e9' },
  { key: 'gold', name: 'TIGER KRX금현물', symbol: '0072R0.KS', role: 'hold', taxClass: 'gold_etf', currency: 'KRW', color: '#f59e0b' },
  { key: 'kodex200', name: 'KODEX 200', symbol: '069500.KS', role: 'hold', taxClass: 'domestic_equity', currency: 'KRW', color: '#ef4444' },
  { key: 'kodex_kosdaq150', name: 'KODEX 코스닥150', symbol: '229200.KS', role: 'hold', taxClass: 'domestic_equity', currency: 'KRW', color: '#10b981' },
  { key: 'semiconductor_top10', name: 'TIGER 반도체TOP10', symbol: '396500.KS', role: 'hold', taxClass: 'domestic_equity', currency: 'KRW', color: '#ec4899' },
  { key: 'samsung', name: '삼성전자', symbol: '005930.KS', role: 'hold', taxClass: 'domestic_equity', currency: 'KRW', color: '#14b8a6' },
  { key: 'btc', name: '비트코인', symbol: 'BTC-USD', role: 'hold', taxClass: 'crypto', currency: 'USD', color: '#f97316' },
];

export const ASSET_KEYS: readonly string[] = ASSETS.map((a) => a.key);

export const CORE_ASSETS: readonly AssetDef[] = ASSETS.filter((a) => a.role === 'core');

export const HOLD_ASSETS: readonly AssetDef[] = ASSETS.filter((a) => a.role === 'hold');

/** 코어 묶음과 기본 목표 비중 (S&P500 70 : 나스닥100 30) */
export const CORE_GROUPS: Readonly<Record<CoreGroup, { label: string; defaultWeight: number }>> = {
  sp500: { label: 'S&P500', defaultWeight: 0.7 },
  nasdaq100: { label: '나스닥100', defaultWeight: 0.3 },
};

/** 코어 묶음 순서 (표시·계산 순서) */
export const CORE_GROUP_KEYS: readonly CoreGroup[] = ['sp500', 'nasdaq100'];

export function getAsset(key: string): AssetDef | undefined {
  return ASSETS.find((a) => a.key === key);
}

export function isCoreAsset(key: string): boolean {
  return getAsset(key)?.role === 'core';
}

/** 묶음의 신규 매수 종목 (S&P500 → snp, 나스닥100 → nasdaq_kodex) */
export function getBuyVehicle(group: CoreGroup): AssetDef {
  const vehicle = ASSETS.find((a) => a.group === group && a.buyVehicle);
  if (!vehicle) throw new Error(`매수 종목이 없는 코어 묶음: ${group}`);
  return vehicle;
}

/** 묶음에 속한 자산 키 (나스닥100 → nasdaq, nasdaq_kodex) */
export function getGroupKeys(group: CoreGroup): string[] {
  return CORE_ASSETS.filter((a) => a.group === group).map((a) => a.key);
}

/** 세금 분류로 자산 키 목록 */
export function keysByTaxClass(...classes: TaxClass[]): string[] {
  return ASSETS.filter((a) => classes.includes(a.taxClass)).map((a) => a.key);
}
