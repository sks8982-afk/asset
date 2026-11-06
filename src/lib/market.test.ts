import { describe, expect, it } from 'vitest';
import {
  buildMonthlySeries, indexStripItems, mergeMonthlyHistory, parseIndices, resolveExchangeTimeZone,
  EX_KEY, FALLBACK_KRW_PER_USD, type MonthlyQuote,
} from './market';

const q = (iso: string, close: number | null | undefined): MonthlyQuote => ({ date: new Date(iso), close });

// 2026-11-05 Yahoo 응답과 같은 모양: 국내 월봉은 그달 1일 00:00 KST(= 전달 말일 15:00 UTC)
const SAMSUNG = [
  q('2026-01-31T15:00:00Z', 216500), // 2월봉 (2/27 종가)
  q('2026-02-28T15:00:00Z', 167200), // 3월봉
  q('2026-09-30T15:00:00Z', 225000), // 10월봉
  q('2026-10-31T15:00:00Z', 218000), // 11월 진행 중 월봉
  q('2026-11-05T05:00:33Z', 202500), // 실시간 시세
];

describe('buildMonthlySeries', () => {
  it('labels Korean bars by exchange time zone (Samsung 2026-02 = 216,500)', () => {
    const series = buildMonthlySeries(SAMSUNG, 'Asia/Seoul');
    expect(series.find((pt) => pt.d === '2026-02')?.p).toBe(216500);
    expect(series.find((pt) => pt.d === '2026-01')).toBeUndefined();
  });

  it('keeps the chronologically last value of a month (live point beats in-progress bar)', () => {
    const series = buildMonthlySeries(SAMSUNG, 'Asia/Seoul');
    expect(series).toEqual([
      { d: '2026-02', p: 216500 },
      { d: '2026-03', p: 167200 },
      { d: '2026-10', p: 225000 },
      { d: '2026-11', p: 202500 },
    ]);
  });

  it('uses time order, not input order, to pick the last value', () => {
    const shuffled = [SAMSUNG[4], SAMSUNG[0], SAMSUNG[3], SAMSUNG[2], SAMSUNG[1]];
    expect(buildMonthlySeries(shuffled, 'Asia/Seoul')).toEqual(buildMonthlySeries(SAMSUNG, 'Asia/Seoul'));
  });

  it('labels UTC-stamped BTC bars in UTC without duplicates', () => {
    const btc = [
      q('2026-02-01T00:00:00Z', 66995.86),
      q('2026-11-01T00:00:00Z', 77345.05),
      q('2026-11-05T06:22:03Z', 80460.38),
    ];
    expect(buildMonthlySeries(btc, 'UTC')).toEqual([
      { d: '2026-02', p: 66995.86 },
      { d: '2026-11', p: 80460.38 },
    ]);
  });

  it('skips missing, non-finite, non-positive closes and invalid dates', () => {
    const series = buildMonthlySeries(
      [
        q('2026-01-31T15:00:00Z', null),
        q('2026-02-28T15:00:00Z', undefined),
        q('2026-03-31T15:00:00Z', Number.NaN),
        q('2026-04-30T15:00:00Z', 0),
        q('2026-05-31T15:00:00Z', -5),
        q('2026-06-30T15:00:00Z', Number.POSITIVE_INFINITY),
        { date: new Date('invalid'), close: 100 },
        null,
        q('2026-07-31T15:00:00Z', 1000),
      ],
      'Asia/Seoul',
    );
    expect(series).toEqual([{ d: '2026-08', p: 1000 }]);
  });

  it('does not mutate the input', () => {
    const input = [SAMSUNG[4], SAMSUNG[0]];
    const copy = [...input];
    buildMonthlySeries(input, 'Asia/Seoul');
    expect(input).toEqual(copy);
  });

  it('returns an empty series for no quotes', () => {
    expect(buildMonthlySeries([], 'UTC')).toEqual([]);
  });
});

describe('resolveExchangeTimeZone', () => {
  it('prefers the chart meta time zone', () => {
    expect(resolveExchangeTimeZone('KRW=X', 'Europe/London')).toBe('Europe/London');
    expect(resolveExchangeTimeZone('005930.KS', 'Asia/Seoul')).toBe('Asia/Seoul');
  });

  it('falls back to Asia/Seoul for Korean symbols and UTC otherwise', () => {
    expect(resolveExchangeTimeZone('005930.KS')).toBe('Asia/Seoul');
    expect(resolveExchangeTimeZone('229200.KQ', null)).toBe('Asia/Seoul');
    expect(resolveExchangeTimeZone('BTC-USD', '')).toBe('UTC');
    expect(resolveExchangeTimeZone('KRW=X')).toBe('UTC');
  });
});

describe('mergeMonthlyHistory', () => {
  const series = {
    snp: [{ d: '2026-09', p: 25310 }, { d: '2026-10', p: 25075 }, { d: '2026-11', p: 25510 }],
    nasdaq_kodex: [{ d: '2026-10', p: 24875 }, { d: '2026-11', p: 24900 }],
    btc: [{ d: '2026-08', p: 90000 }, { d: '2026-10', p: 77000 }, { d: '2026-11', p: 80000 }],
    [EX_KEY]: [{ d: '2026-10', p: 1400 }, { d: '2026-11', p: 1342.5 }],
  };

  it('builds one row per master month, in order', () => {
    const rows = mergeMonthlyHistory(series, 'snp', ['btc']);
    expect(rows.map((r) => r.d)).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('fills missing prices with 0 and converts USD assets with the same month FX', () => {
    const rows = mergeMonthlyHistory(series, 'snp', ['btc']);
    expect(rows[0]).toEqual({ d: '2026-09', snp: 25310, nasdaq_kodex: 0, btc: 0, ex: FALLBACK_KRW_PER_USD });
    expect(rows[1]).toEqual({ d: '2026-10', snp: 25075, nasdaq_kodex: 24875, btc: 77000 * 1400, ex: 1400 });
    expect(rows[2].btc).toBeCloseTo(80000 * 1342.5);
  });

  it('returns no rows when the master series is missing', () => {
    expect(mergeMonthlyHistory(series, 'tech10', ['btc'])).toEqual([]);
  });
});

describe('market indices (month tab card)', () => {
  const raw = {
    kospi: { price: 5384.27, change: -301.2, changePct: -5.2981 },
    kosdaq: { price: 912.5, change: 3, changePct: 0.33 },
    sp500: { price: 7689.4, change: 121, changePct: 1.6012 },
    nasdaq_idx: { price: 25737.1, change: 356, changePct: 1.4 },
    dow: { price: 'n/a', change: 0, changePct: 0 },
  };

  it('keeps indices with a valid price and cleans the change fields', () => {
    const parsed = parseIndices({ ...raw, kosdaq: { price: 912.5, changePct: Number.NaN } });
    expect(Object.keys(parsed ?? {})).toEqual(['kospi', 'kosdaq', 'sp500', 'nasdaq_idx']);
    expect(parsed?.kosdaq).toEqual({ price: 912.5, change: 0, changePct: 0 });
    expect(parseIndices(undefined)).toBeNull();
    expect(parseIndices([])).toBeNull();
    expect(parseIndices({ dow: raw.dow, sp500: { price: 0 } })).toBeNull();
  });

  it('formats KOSPI, S&P500 and Nasdaq in that order', () => {
    expect(indexStripItems(parseIndices(raw))).toEqual([
      { key: 'kospi', label: 'KOSPI', price: '5,384', changePct: '5.3%', direction: 'down' },
      { key: 'sp500', label: 'S&P500', price: '7,689', changePct: '1.6%', direction: 'up' },
      { key: 'nasdaq_idx', label: '나스닥', price: '25,737', changePct: '1.4%', direction: 'up' },
    ]);
  });

  it('keeps decimals below 1,000, treats a rounded 0.0% as flat and skips missing indices', () => {
    expect(indexStripItems({ kospi: { price: 987.654, change: 0, changePct: -0.04 } })).toEqual([
      { key: 'kospi', label: 'KOSPI', price: '987.65', changePct: '0.0%', direction: 'flat' },
    ]);
    expect(indexStripItems(null)).toEqual([]);
  });
});
