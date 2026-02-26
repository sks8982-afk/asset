import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

export async function GET() {
  try {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 10);

    // 테크TOP10·나스닥·S&P·금은·KODEX 코스닥150·TIGER 반도체TOP10·삼성전자·비트코인·환율
    const symbols: Record<string, string> = {
      tech10: '381170.KS', // TIGER 미국테크TOP10 INDXX
      nasdaq: '133690.KS', // TIGER 미국나스닥100
      snp: '360750.KS', // TIGER 미국 S&P500
      gold: '139320.KS', // TIGER 금은선물(H)
      kodex_kosdaq150: '229200.KS', // KODEX 코스닥150 (KOSPI 상장 ETF)
      semiconductor_top10: '396500.KS', // TIGER 반도체TOP10
      samsung: '005930.KS', // 삼성전자 (KOSPI)
      btc: 'BTC-USD', // 비트코인 (달러 기준)
      ex: 'KRW=X', // 환율
    };

    const fetchAsset = async (key: string, symbol: string) => {
      try {
        const result = await yf.chart(symbol, {
          period1: start,
          period2: end,
          interval: '1mo',
        });
        return {
          key,
          quotes: (result.quotes || [])
            .filter(
              (q): q is { close: number; date: Date } =>
                q != null && typeof q.close === 'number' && q.date instanceof Date
            )
            .map((q) => ({
              d: q.date.toISOString().slice(0, 7),
              p: q.close,
            })),
        };
      } catch {
        return { key, quotes: [] };
      }
    };

    const allData = await Promise.all(
      Object.entries(symbols).map(([k, s]) => fetchAsset(k, s))
    );
    const master = allData.find((d) => d.key === 'tech10')?.quotes || [];

    const history = master
      .map((m) => {
        const findP = (k: string) =>
          allData.find((d) => d.key === k)?.quotes.find((q) => q.d === m.d)
            ?.p || 0;
        const ex = findP('ex') || 1350;
        return {
          d: m.d,
          tech10: findP('tech10'),
          nasdaq: findP('nasdaq'),
          snp: findP('snp'),
          gold: findP('gold'),
          kodex_kosdaq150: findP('kodex_kosdaq150'),
          semiconductor_top10: findP('semiconductor_top10'),
          samsung: findP('samsung'),
          btc: findP('btc') * ex, // 비트코인 원화 환산
          ex,
        };
      })
      .filter((i) => i.tech10 > 0);

    // 실시간 시세 (일단 새로고침 시점 기준 quote 사용)
    const latest: any = {};
    // 환율 실시간
    const exQuote: any = await yf.quote(symbols.ex);
    const exLive =
      (exQuote && typeof exQuote.regularMarketPrice === 'number'
        ? exQuote.regularMarketPrice
        : history[history.length - 1]?.ex) || 1350;
    latest.ex = exLive;

    // 각 자산 실시간 시세 (종목별 실패 시 과거 종가로 보정)
    const getLastHistoryPrice = (k: string) => {
      const last = history[history.length - 1];
      return last && typeof (last as Record<string, number>)[k] === 'number'
        ? (last as Record<string, number>)[k]
        : 0;
    };
    for (const [key, symbol] of Object.entries(symbols)) {
      if (key === 'ex') continue;
      try {
        const q = await yf.quote(symbol);
        const p =
          (q && typeof (q as { regularMarketPrice?: number }).regularMarketPrice === 'number'
            ? (q as { regularMarketPrice: number }).regularMarketPrice
            : null) ??
          (q && typeof (q as { regularMarketOpen?: number }).regularMarketOpen === 'number'
            ? (q as { regularMarketOpen: number }).regularMarketOpen
            : null) ??
          (q && typeof (q as { regularMarketPreviousClose?: number }).regularMarketPreviousClose === 'number'
            ? (q as { regularMarketPreviousClose: number }).regularMarketPreviousClose
            : null) ??
          getLastHistoryPrice(key) ??
          0;
        if (key === 'btc') latest.btc = p * exLive;
        else latest[key] = p;
      } catch {
        const fallback = getLastHistoryPrice(key);
        // btc in history is already KRW; other keys are per-asset
        if (key === 'btc') latest.btc = fallback;
        else latest[key] = fallback;
      }
    }

    return NextResponse.json({ history, latest });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
