import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

export async function GET() {
  try {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 10);

    // 테크TOP10·나스닥·S&P 주력, 금은·코인·현금
    const symbols: Record<string, string> = {
      tech10: '381170.KS', // TIGER 미국테크TOP10 INDXX
      nasdaq: '133690.KS', // TIGER 미국나스닥100
      snp: '360750.KS', // TIGER 미국S&P500
      gold: '139320.KS', // TIGER 금은선물(H)
      btc: 'BTC-USD', // 비트코인 (달러 기준)
      ex: 'KRW=X', // 환율
    };

    const fetchAsset = async (key: string, symbol: string) => {
      const result = await yf.chart(symbol, {
        period1: start,
        period2: end,
        interval: '1mo',
      });
      return {
        key,
        quotes: (result.quotes || [])
          .filter(
            (q: any): q is any =>
              q && typeof q.close === 'number' && q.date instanceof Date
          )
          .map((q: any) => ({
            d: q.date.toISOString().slice(0, 7),
            p: q.close,
          })),
      };
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

    // 각 자산 실시간 시세
    for (const [key, symbol] of Object.entries(symbols)) {
      if (key === 'ex') continue;
      const q: any = await yf.quote(symbol);
      const p =
        q && typeof q.regularMarketPrice === 'number'
          ? q.regularMarketPrice
          : 0;
      if (key === 'btc') latest.btc = p * exLive;
      else latest[key] = p;
    }

    return NextResponse.json({ history, latest });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
