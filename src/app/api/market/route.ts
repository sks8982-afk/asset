import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { ASSETS } from '@/lib/assets';
import {
  buildMonthlySeries, mergeMonthlyHistory, resolveExchangeTimeZone,
  EX_KEY, FALLBACK_KRW_PER_USD, type MonthlyPoint,
} from '@/lib/market';

// 실행 리전(서울 icn1)은 vercel.json의 regions로 지정한다.
const yf = new YahooFinance();

/** 월 목록의 기준 종목 — 이 종목에 가격이 있는 달만 history에 담는다 */
const MASTER_KEY = 'snp';

/** 환율 (원/달러) */
const EX_SYMBOL = 'KRW=X';

/** 주요 지수 (참고용) */
const INDEX_SYMBOLS: Record<string, string> = {
  kospi: '^KS11',      // 코스피
  kosdaq: '^KQ11',     // 코스닥
  sp500: '^GSPC',      // S&P 500
  nasdaq_idx: '^IXIC', // 나스닥 종합
  dow: '^DJI',         // 다우존스
};

type QuoteFields = {
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
};

/** 월봉 시계열 (실패 시 빈 배열) */
async function fetchMonthly(symbol: string, start: Date, end: Date): Promise<MonthlyPoint[]> {
  try {
    const result = await yf.chart(symbol, { period1: start, period2: end, interval: '1mo' });
    const timeZone = resolveExchangeTimeZone(symbol, result.meta?.exchangeTimezoneName);
    return buildMonthlySeries(result.quotes ?? [], timeZone);
  } catch {
    return [];
  }
}

/** 실시간 시세 (실패 시 null) */
async function fetchQuote(symbol: string): Promise<QuoteFields | null> {
  try {
    return (await yf.quote(symbol)) as QuoteFields | null;
  } catch {
    return null;
  }
}

/** 현재가 → 시가 → 전일 종가 순으로 쓸 수 있는 값 */
function livePriceOf(q: QuoteFields | null): number | null {
  if (!q) return null;
  const candidates = [q.regularMarketPrice, q.regularMarketOpen, q.regularMarketPreviousClose];
  return candidates.find((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0) ?? null;
}

export async function GET() {
  try {
    const end = new Date();
    const start = new Date(end);
    start.setFullYear(end.getFullYear() - 10);

    const symbolEntries: [string, string][] = [
      ...ASSETS.map((a): [string, string] => [a.key, a.symbol]),
      [EX_KEY, EX_SYMBOL],
    ];
    const indexEntries = Object.entries(INDEX_SYMBOLS);
    const usdKeys = ASSETS.filter((a) => a.currency === 'USD').map((a) => a.key);

    // 월봉·실시간 시세·지수를 한꺼번에 조회 (yahoo-finance2가 내부 큐로 동시 요청 수를 제한)
    const [monthly, quotes, indexQuotes] = await Promise.all([
      Promise.all(symbolEntries.map(([, symbol]) => fetchMonthly(symbol, start, end))),
      Promise.all(symbolEntries.map(([, symbol]) => fetchQuote(symbol))),
      Promise.all(indexEntries.map(([, symbol]) => fetchQuote(symbol))),
    ]);

    const series = Object.fromEntries(symbolEntries.map(([key], i) => [key, monthly[i]]));
    const history = mergeMonthlyHistory(series, MASTER_KEY, usdKeys);
    const lastRow = history[history.length - 1];
    const lastHistoryPrice = (key: string): number => {
      const v = lastRow?.[key];
      return typeof v === 'number' ? v : 0;
    };

    // 실시간 조회에 실패해 과거 종가로 폴백한 자산을 기록 → UI에서 지연 표시
    const liveByKey = new Map(symbolEntries.map(([key], i) => [key, livePriceOf(quotes[i])]));
    const exFresh = liveByKey.get(EX_KEY) ?? null;
    const exStale = exFresh == null;
    const exLive = exFresh ?? (lastHistoryPrice(EX_KEY) || FALLBACK_KRW_PER_USD);

    const latest: Record<string, number> = { [EX_KEY]: exLive };
    const staleKeys: string[] = [];
    for (const [key] of symbolEntries) {
      if (key === EX_KEY) continue;
      const live = liveByKey.get(key) ?? null;
      if (live == null) {
        staleKeys.push(key);
        latest[key] = lastHistoryPrice(key); // history 값은 이미 원화 환산됨
      } else {
        latest[key] = usdKeys.includes(key) ? live * exLive : live;
      }
    }

    const indices: Record<string, { price: number; change: number; changePct: number }> = {};
    indexEntries.forEach(([key], i) => {
      const q = indexQuotes[i];
      if (q && typeof q.regularMarketPrice === 'number') {
        indices[key] = {
          price: q.regularMarketPrice,
          change: q.regularMarketChange ?? 0,
          changePct: q.regularMarketChangePercent ?? 0,
        };
      }
    });

    return NextResponse.json({
      history,
      latest,
      indices,
      fetchedAt: new Date().toISOString(),
      staleKeys,
      exStale,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
