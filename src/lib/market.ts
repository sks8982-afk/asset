import type { MarketDataPoint } from './types';
import { monthLabel } from './date';

/** Yahoo 월봉 한 개 (chart() quotes 원소에서 필요한 부분) */
export type MonthlyQuote = { date: Date; close: number | null | undefined };

/** 월별 종가 */
export type MonthlyPoint = { d: string; p: number };

/** 환율을 못 구했을 때 쓰는 원/달러 */
export const FALLBACK_KRW_PER_USD = 1350;

/** history 행에서 환율이 들어가는 키 */
export const EX_KEY = 'ex';

/**
 * 월봉 라벨에 쓸 거래소 시간대.
 * chart() meta.exchangeTimezoneName이 있으면 그 값, 없으면 국내 종목은 Asia/Seoul, 나머지는 UTC.
 */
export function resolveExchangeTimeZone(symbol: string, metaTimeZone?: string | null): string {
  if (typeof metaTimeZone === 'string' && metaTimeZone.length > 0) return metaTimeZone;
  return /\.(KS|KQ)$/.test(symbol) ? 'Asia/Seoul' : 'UTC';
}

function hasValidClose(q: MonthlyQuote | null | undefined): q is { date: Date; close: number } {
  return (
    q != null
    && q.date instanceof Date
    && !Number.isNaN(q.date.getTime())
    && typeof q.close === 'number'
    && Number.isFinite(q.close)
    && q.close > 0
  );
}

/**
 * Yahoo 월봉 → 월별 종가 시계열.
 * - 거래소 시간대로 월을 매긴다 (국내 월봉은 그달 1일 00:00 KST = 전달 말일 15:00 UTC로 찍혀 온다)
 * - 종가가 없거나 0 이하인 봉은 버린다
 * - 같은 달 값이 여러 개면 시간상 마지막 값 (이번 달은 진행 중 월봉 + 실시간 시세가 함께 온다)
 * - 결과는 월 오름차순
 */
export function buildMonthlySeries(
  quotes: readonly (MonthlyQuote | null | undefined)[],
  timeZone: string,
): MonthlyPoint[] {
  const valid = quotes
    .filter(hasValidClose)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const byMonth = new Map<string, number>();
  for (const q of valid) {
    byMonth.set(monthLabel(q.date, timeZone), q.close);
  }
  return Array.from(byMonth, ([d, p]) => ({ d, p })).sort((a, b) => a.d.localeCompare(b.d));
}

// ─── 주요 지수 (이번 달 탭 '내 자산' 위) ───

/** 지수 한 개 — /api/market의 indices 값 */
export type IndexQuote = { price: number; change: number; changePct: number };

/** 지수 키(kospi·sp500·nasdaq_idx 등) → 시세 */
export type MarketIndices = Record<string, IndexQuote>;

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** /api/market의 indices — 가격이 있는 지수만 남긴다 (하나도 없거나 형식이 다르면 null) */
export function parseIndices(raw: unknown): MarketIndices | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const out: MarketIndices = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const quote = value as Record<string, unknown>;
    const price = finiteNumber(quote.price);
    if (price == null || price <= 0) continue;
    out[key] = { price, change: finiteNumber(quote.change) ?? 0, changePct: finiteNumber(quote.changePct) ?? 0 };
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** 화면에 보이는 지수 (이 순서) */
const INDEX_STRIP: readonly { key: string; label: string }[] = [
  { key: 'kospi', label: 'KOSPI' },
  { key: 'sp500', label: 'S&P500' },
  { key: 'nasdaq_idx', label: '나스닥' },
];

export type IndexStripItem = {
  key: string;
  label: string;
  /** 1,000 이상은 소수 없이 */
  price: string;
  /** 등락률 절댓값, 소수 한 자리 ('5.3%') */
  changePct: string;
  /** 반올림해 0.0%면 flat */
  direction: 'up' | 'down' | 'flat';
};

/** 지수 표시 항목 — 시세가 없는 지수는 뺀다 (등락률은 전일 종가 대비) */
export function indexStripItems(indices: MarketIndices | null): IndexStripItem[] {
  if (!indices) return [];
  return INDEX_STRIP.flatMap(({ key, label }) => {
    const quote = indices[key];
    if (!quote) return [];
    const pct = Math.abs(quote.changePct).toFixed(1);
    const direction = Number(pct) === 0 ? 'flat' : quote.changePct > 0 ? 'up' : 'down';
    const price = quote.price.toLocaleString('en-US', { maximumFractionDigits: quote.price >= 1000 ? 0 : 2 });
    return [{ key, label, price, changePct: `${pct}%`, direction }];
  });
}

/**
 * 종목별 월별 시계열을 월 단위 행으로 합친다.
 * - 기준(masterKey) 종목에 가격이 있는 달만 행을 만든다
 * - 그 달 가격이 없는 종목은 0
 * - usdKeys 종목은 같은 달 환율(series.ex, 없으면 1350)로 원화 환산
 */
export function mergeMonthlyHistory(
  series: Readonly<Record<string, readonly MonthlyPoint[]>>,
  masterKey: string,
  usdKeys: readonly string[],
): MarketDataPoint[] {
  const priceMaps = new Map(
    Object.entries(series).map(([key, points]) => [key, new Map(points.map((pt) => [pt.d, pt.p]))]),
  );
  const assetKeys = Object.keys(series).filter((key) => key !== EX_KEY);
  const months = (series[masterKey] ?? []).map((pt) => pt.d);

  return months.map((d) => {
    const ex = priceMaps.get(EX_KEY)?.get(d) ?? FALLBACK_KRW_PER_USD;
    const prices = assetKeys.map((key) => {
      const p = priceMaps.get(key)?.get(d) ?? 0;
      return [key, usdKeys.includes(key) ? p * ex : p] as const;
    });
    return { d, ...Object.fromEntries(prices), [EX_KEY]: ex };
  });
}
