'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  DbHistory, DividendRecord, MarketDataPoint, LivePrices,
} from '@/lib/types';

type MarketIndex = { price: number; change: number; changePct: number };

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

type UseAppDataResult = {
  loading: boolean;
  isRefreshing: boolean;
  marketData: MarketDataPoint[];
  fullMarketHistory: MarketDataPoint[];
  livePrices: LivePrices | null;
  marketMeta: MarketMeta;
  marketIndices: Record<string, MarketIndex>;
  dbHistory: DbHistory;
  setDbHistory: React.Dispatch<React.SetStateAction<DbHistory>>;
  emergencyFundAmount: number;
  setEmergencyFundAmount: (v: number) => void;
  reload: () => Promise<void>;
};

/**
 * 앱의 모든 원격 데이터(시세 API + Supabase)를 통합 로드하는 훅.
 * - 마운트 시 자동 호출
 * - reload()로 수동 새로고침 지원
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
  const [marketIndices, setMarketIndices] = useState<Record<string, MarketIndex>>({});
  const [dbHistory, setDbHistory] = useState<DbHistory>({
    budgets: [], records: [], batchSummaries: [], snapshots: [], dividends: [],
  });
  const [emergencyFundAmount, setEmergencyFundAmount] = useState<number>(300000);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 시세 로드 실패 시 앱 전체가 죽지 않도록 격리 — 기존 데이터 유지 + 오류 표시
      try {
        const res = await fetch('/api/market');
        const payload = await res.json();

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
          const { history, latest, indices, fetchedAt, staleKeys, exStale } = payload;
          setFullMarketHistory(history);
          setMarketData(history.filter((d: MarketDataPoint) => d.d >= '2025-01'));
          setLivePrices(latest || null);
          if (indices) setMarketIndices(indices);
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
        setMarketMeta((prev) => ({ ...prev, error: true }));
      }

      const { data: bData } = await supabase
        .from('monthly_budgets')
        .select('*')
        .order('month_date', { ascending: true });
      const { data: rData } = await supabase
        .from('investment_records')
        .select('*')
        .order('date', { ascending: true });

      let snapshots: { date: string; balance: number }[] = [];
      try {
        const { data: sData } = await supabase
          .from('cash_balance_snapshots')
          .select('date, balance')
          .order('date', { ascending: true });
        snapshots = (sData || []).map((s) => ({
          date: String(s.date).slice(0, 10),
          balance: Number(s.balance ?? 0),
        }));
      } catch {
        // table may not exist
      }

      let batchSummaries: {
        batch_id: string;
        date: string;
        deposit: number;
        total_spent: number;
        remaining_cash: number;
      }[] = [];
      try {
        const { data: sumData } = await supabase
          .from('batch_summaries')
          .select('batch_id, date, deposit, total_spent, remaining_cash');
        batchSummaries = (sumData || []).map((s) => ({
          batch_id: String(s.batch_id),
          date: String(s.date).slice(0, 10),
          deposit: Number(s.deposit ?? 0),
          total_spent: Number(s.total_spent ?? 0),
          remaining_cash: Number(s.remaining_cash ?? 0),
        }));
      } catch {
        // table may not exist
      }

      let emergencyFund = 300000;
      try {
        const { data: settingsRow } = await supabase
          .from('app_settings')
          .select('emergency_fund_amount')
          .eq('id', 1)
          .maybeSingle();
        if (settingsRow?.emergency_fund_amount != null)
          emergencyFund = Number(settingsRow.emergency_fund_amount) || 300000;
      } catch {
        // table may not exist
      }
      setEmergencyFundAmount(emergencyFund);

      let dividends: DividendRecord[] = [];
      try {
        const { data: divData } = await supabase
          .from('dividends')
          .select('*')
          .order('date', { ascending: true });
        dividends = (divData || []).map((d: Record<string, unknown>) => ({
          id: d.id as string | undefined,
          date: String(d.date ?? '').slice(0, 10),
          asset_key: String(d.asset_key ?? ''),
          amount: Number(d.amount ?? 0),
          is_reinvested: Boolean(d.is_reinvested),
          note: (d.note as string | undefined) ?? '',
        }));
      } catch {
        // table may not exist
      }

      setDbHistory({
        budgets: bData || [],
        records: rData || [],
        batchSummaries,
        snapshots,
        dividends,
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    loading,
    isRefreshing,
    marketData,
    fullMarketHistory,
    livePrices,
    marketMeta,
    marketIndices,
    dbHistory,
    setDbHistory,
    emergencyFundAmount,
    setEmergencyFundAmount,
    reload,
  };
}
