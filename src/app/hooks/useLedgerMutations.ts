'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbHistory, DividendRecord } from '@/lib/types';
import { toast } from './useToast';

/** neq 조건용 — 실제로는 없는 id (전체 삭제에 사용) */
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

type LedgerMutationsInput = {
  reload: () => Promise<void>;
  setDbHistory: React.Dispatch<React.SetStateAction<DbHistory>>;
};

/** 장부 쓰기 — 배당 추가/삭제, BTC 매수액 보정, DB 초기화 (설정은 useSettings) */
export function useLedgerMutations({ reload, setDbHistory }: LedgerMutationsInput) {
  const [isResetting, setIsResetting] = useState(false);

  const saveBtcAmountOverride = useCallback(async (recordId: string, amountOverride: number | null): Promise<void> => {
    const { error } = await supabase
      .from('investment_records')
      .update({ amount_override: amountOverride })
      .eq('id', recordId);
    if (error) {
      toast.error('매수액 수정 저장에 실패했습니다.');
      return;
    }
    setDbHistory((prev) => ({
      ...prev,
      records: prev.records.map((r) => (r.id === recordId ? { ...r, amount_override: amountOverride } : r)),
    }));
  }, [setDbHistory]);

  const addDividend = useCallback(async (dividend: Omit<DividendRecord, 'id'>): Promise<void> => {
    const { error } = await supabase.from('dividends').insert(dividend);
    if (error) {
      toast.error('배당금 저장에 실패했습니다.');
      return;
    }
    toast.success('배당금이 기록되었습니다.');
    await reload();
  }, [reload]);

  const deleteDividend = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from('dividends').delete().eq('id', id);
    if (error) {
      toast.error('배당금 삭제에 실패했습니다.');
      return;
    }
    toast.info('배당금이 삭제되었습니다.');
    await reload();
  }, [reload]);

  /** 매수·매도 기록, 월별 입금, 배당, 잔고 스냅샷, 배치 요약 전부 삭제 (설정은 유지) */
  const resetDb = useCallback(async (): Promise<void> => {
    setIsResetting(true);
    try {
      const results = await Promise.all([
        supabase.from('investment_records').delete().neq('id', NIL_UUID),
        supabase.from('monthly_budgets').delete().neq('id', NIL_UUID),
        supabase.from('dividends').delete().neq('id', NIL_UUID),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      // 보조 테이블 — 없을 수 있음
      await Promise.allSettled([
        supabase.from('cash_balance_snapshots').delete().neq('date', '1970-01-01'),
        supabase.from('batch_summaries').delete().neq('batch_id', NIL_UUID),
      ]);
      toast.warning('DB가 초기화되었습니다.');
    } catch {
      toast.error('초기화하지 못했습니다. 로그인 상태와 인터넷 연결을 확인해 주세요.');
    } finally {
      await reload();
      setIsResetting(false);
    }
  }, [reload]);

  return {
    saveBtcAmountOverride,
    addDividend,
    deleteDividend,
    resetDb,
    isResetting,
  };
}
