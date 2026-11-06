'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { parseIndices, type MarketIndices } from '@/lib/market';
import type {
  BatchSummary, CashSnapshot, DbHistory, DividendRecord, InvestmentRecord, LivePrices, MarketDataPoint, MonthlyBudget,
} from '@/lib/types';

export type MarketMeta = {
  /** 시세 조회 시각 (ISO). null이면 아직 성공한 조회 없음 */
  fetchedAt: string | null;
  /** 실시간 조회 실패로 과거 종가 폴백된 자산 키 */
  staleKeys: string[];
  /** 환율이 폴백 값인지 여부 */
  exStale: boolean;
  /** 시세 API 호출 자체가 실패했는지 여부 */
  error: boolean;
};

/** 장부를 읽지 못했을 때 화면 맨 위에 띄우는 문구 */
export const LEDGER_LOAD_ERROR = '장부를 불러오지 못했습니다 — 새로고침하거나 다시 로그인해 주세요';

/** 장부를 못 불러온 상태에서 쓰기를 시도했을 때 */
export const LEDGER_LOCKED_MESSAGE = '장부를 불러오지 못해 지금은 기록·삭제할 수 없습니다. 장부를 다시 불러온 뒤에 해 주세요.';

type UseAppDataResult = {
  loading: boolean;
  isRefreshing: boolean;
  marketData: MarketDataPoint[];
  fullMarketHistory: MarketDataPoint[];
  livePrices: LivePrices | null;
  marketMeta: MarketMeta;
  /** 주요 지수 (이번 달 탭 위쪽에 표시, 없으면 null) */
  indices: MarketIndices | null;
  dbHistory: DbHistory;
  /** 장부를 한 번이라도 제대로 불러왔는지 */
  dbLoaded: boolean;
  /** 마지막 장부 읽기가 실패했으면 안내 문구 (그동안 dbHistory는 이전 값 그대로) */
  dbLoadError: string | null;
  setDbHistory: React.Dispatch<React.SetStateAction<DbHistory>>;
  reload: () => Promise<void>;
};

type Row = Record<string, unknown>;

/** select 결과 행 — 오류면 throw (빈 배열로 대신하면 장부가 빈 것처럼 보인다) */
function rowsOf(result: { data: unknown; error: unknown }): Row[] {
  if (result.error) throw result.error;
  return Array.isArray(result.data) ? (result.data as Row[]) : [];
}

/**
 * 장부 표 5개(입금·매수매도·잔고 스냅샷·차수 요약·배당)를 읽는다.
 * 하나라도 { error }가 오면 throw — 일부만 읽은 장부로 계산하지 않는다.
 */
export async function fetchLedger(): Promise<DbHistory> {
  const [budgets, records, snapshots, summaries, dividends] = await Promise.all([
    supabase.from('monthly_budgets').select('*').order('month_date', { ascending: true }),
    supabase.from('investment_records').select('*').order('date', { ascending: true }),
    supabase.from('cash_balance_snapshots').select('date, balance').order('date', { ascending: true }),
    supabase.from('batch_summaries').select('batch_id, date, deposit, total_spent, remaining_cash'),
    supabase.from('dividends').select('*').order('date', { ascending: true }),
  ]);
  return {
    budgets: rowsOf(budgets) as MonthlyBudget[],
    records: rowsOf(records) as InvestmentRecord[],
    snapshots: rowsOf(snapshots).map((s): CashSnapshot => ({
      date: String(s.date).slice(0, 10),
      balance: Number(s.balance ?? 0),
    })),
    batchSummaries: rowsOf(summaries).map((s): BatchSummary => ({
      batch_id: String(s.batch_id),
      date: String(s.date).slice(0, 10),
      deposit: Number(s.deposit ?? 0),
      total_spent: Number(s.total_spent ?? 0),
      remaining_cash: Number(s.remaining_cash ?? 0),
    })),
    dividends: rowsOf(dividends).map((d): DividendRecord => ({
      id: d.id as string | undefined,
      date: String(d.date ?? '').slice(0, 10),
      asset_key: String(d.asset_key ?? ''),
      amount: Number(d.amount ?? 0),
      is_reinvested: Boolean(d.is_reinvested),
      note: (d.note as string | undefined) ?? '',
    })),
  };
}

/**
 * 앱의 모든 원격 데이터(시세 API + Supabase)를 통합 로드하는 훅.
 * - 마운트 시 자동 호출, reload()로 수동 새로고침
 * - 장부 읽기가 실패하면 이전 장부를 그대로 두고 dbLoadError를 채운다
 * - 여러 번 겹쳐 부르면 마지막 호출의 결과만 반영한다 (늦게 끝난 이전 호출이 새 장부를 덮지 않도록)
 */
export function useAppData(): UseAppDataResult {
  const [marketData, setMarketData] = useState<MarketDataPoint[]>([]);
  const [fullMarketHistory, setFullMarketHistory] = useState<MarketDataPoint[]>([]);
  const [livePrices, setLivePrices] = useState<LivePrices | null>(null);
  const [marketMeta, setMarketMeta] = useState<MarketMeta>({
    fetchedAt: null,
    staleKeys: [],
    exStale: false,
    error: false,
  });
  const [indices, setIndices] = useState<MarketIndices | null>(null);
  const [dbHistory, setDbHistory] = useState<DbHistory>({
    budgets: [], records: [], batchSummaries: [], snapshots: [], dividends: [],
  });
  const [dbLoaded, setDbLoaded] = useState(false);
  const [dbLoadError, setDbLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const latestCall = useRef(0);

  // 첫 await 전에는 state를 바꾸지 않는다 (마운트 effect에서 바로 호출)
  const fetchAll = useCallback(async () => {
    const call = ++latestCall.current;
    const isLatest = (): boolean => call === latestCall.current;
    try {
      // 시세 로드 실패 시 앱 전체가 죽지 않도록 격리 — 기존 데이터 유지 + 오류 표시
      try {
        const res = await fetch('/api/market');
        const payload = await res.json();
        if (!isLatest()) return;

        if (Array.isArray(payload)) {
          setFullMarketHistory(payload);
          setMarketData(payload.filter((d) => d.d >= '2025-01'));
          setLivePrices(payload[payload.length - 1] || null);
          setMarketMeta({
            fetchedAt: new Date().toISOString(),
            staleKeys: [],
            exStale: false,
            error: false,
          });
        } else if (payload && Array.isArray(payload.history)) {
          const { history, latest, fetchedAt, staleKeys, exStale } = payload;
          setFullMarketHistory(history);
          setMarketData(history.filter((d: MarketDataPoint) => d.d >= '2025-01'));
          setLivePrices(latest || null);
          setIndices(parseIndices(payload.indices));
          setMarketMeta({
            fetchedAt: typeof fetchedAt === 'string' ? fetchedAt : new Date().toISOString(),
            staleKeys: Array.isArray(staleKeys) ? staleKeys : [],
            exStale: Boolean(exStale),
            error: false,
          });
        } else {
          // {error} 응답 등 비정상 payload — 기존 데이터를 덮어쓰지 않음
          setMarketMeta((prev) => ({ ...prev, error: true }));
        }
      } catch {
        if (isLatest()) setMarketMeta((prev) => ({ ...prev, error: true }));
      }

      try {
        const ledger = await fetchLedger();
        if (!isLatest()) return;
        setDbHistory(ledger);
        setDbLoaded(true);
        setDbLoadError(null);
      } catch {
        // 이전 장부는 그대로 둔다 — 빈 장부(0원)로 보이거나, 이전 값 위에 쓰지 않도록 쓰기는 막힌다
        if (isLatest()) setDbLoadError(LEDGER_LOAD_ERROR);
      }
    } finally {
      if (isLatest()) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  const reload = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return {
    loading,
    isRefreshing,
    marketData,
    fullMarketHistory,
    livePrices,
    marketMeta,
    indices,
    dbHistory,
    dbLoaded,
    dbLoadError,
    setDbHistory,
    reload,
  };
}
