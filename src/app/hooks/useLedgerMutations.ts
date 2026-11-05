'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbHistory, DividendRecord } from '@/lib/types';
import { LEDGER_LOCKED_MESSAGE } from './useAppData';
import { toast } from './useToast';

/** neq 조건용 — 실제로는 없는 id (전체 삭제에 사용) */
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

type LedgerMutationsInput = {
  reload: () => Promise<void>;
  setDbHistory: React.Dispatch<React.SetStateAction<DbHistory>>;
  /** 장부를 제대로 불러온 상태인지 — 아니면 쓰지 않는다 (이전 값 위에 덮어쓰지 않도록) */
  canWrite: boolean;
};

/**
 * 장부 전체 삭제 — 매수·매도 기록, 월별 입금, 배당을 지운 뒤 잔고 스냅샷·차수 요약을 지운다 (설정은 유지).
 * 단계마다 { error }를 확인하고 하나라도 실패하면 throw.
 */
export async function deleteLedgerRows(): Promise<void> {
  const ledger = await Promise.all([
    supabase.from('investment_records').delete().neq('id', NIL_UUID),
    supabase.from('monthly_budgets').delete().neq('id', NIL_UUID),
    supabase.from('dividends').delete().neq('id', NIL_UUID),
  ]);
  const ledgerError = ledger.find((r) => r.error)?.error;
  if (ledgerError) throw ledgerError;
  const derived = await Promise.all([
    supabase.from('cash_balance_snapshots').delete().neq('date', '1970-01-01'),
    supabase.from('batch_summaries').delete().neq('batch_id', NIL_UUID),
  ]);
  const derivedError = derived.find((r) => r.error)?.error;
  if (derivedError) throw derivedError;
}

/** 장부 쓰기 — 배당 추가/삭제, BTC 매수액 보정, DB 초기화 (설정은 useSettings) */
export function useLedgerMutations({ reload, setDbHistory, canWrite }: LedgerMutationsInput) {
  const [isResetting, setIsResetting] = useState(false);

  const saveBtcAmountOverride = useCallback(async (recordId: string, amountOverride: number | null): Promise<void> => {
    if (!canWrite) {
      toast.warning(LEDGER_LOCKED_MESSAGE);
      return;
    }
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
  }, [canWrite, setDbHistory]);

  /** 배당 추가 — 저장했으면 true (실패하면 입력값을 남겨 다시 시도할 수 있게) */
  const addDividend = useCallback(async (dividend: Omit<DividendRecord, 'id'>): Promise<boolean> => {
    if (!canWrite) {
      toast.warning(LEDGER_LOCKED_MESSAGE);
      return false;
    }
    const { error } = await supabase.from('dividends').insert(dividend);
    if (error) {
      toast.error('배당금 저장에 실패했습니다.');
      return false;
    }
    toast.success('배당금이 기록되었습니다.');
    await reload();
    return true;
  }, [canWrite, reload]);

  const deleteDividend = useCallback(async (id: string): Promise<void> => {
    if (!canWrite) {
      toast.warning(LEDGER_LOCKED_MESSAGE);
      return;
    }
    const { error } = await supabase.from('dividends').delete().eq('id', id);
    if (error) {
      toast.error('배당금 삭제에 실패했습니다.');
      return;
    }
    toast.info('배당금이 삭제되었습니다.');
    await reload();
  }, [canWrite, reload]);

  /** 매수·매도 기록, 월별 입금, 배당, 잔고 스냅샷, 배치 요약 전부 삭제 (설정은 유지) */
  const resetDb = useCallback(async (): Promise<void> => {
    if (!canWrite) {
      toast.warning(LEDGER_LOCKED_MESSAGE);
      return;
    }
    setIsResetting(true);
    try {
      await deleteLedgerRows();
      toast.warning('DB가 초기화되었습니다.');
    } catch {
      // 기록 표를 지운 뒤 보조 표에서 실패할 수도 있다 — 다시 실행해도 안전하다
      toast.error('초기화를 끝내지 못했습니다. 일부만 지워졌을 수 있으니 로그인 상태와 인터넷 연결을 확인한 뒤 다시 실행해 주세요.', 6000);
    } finally {
      await reload();
      setIsResetting(false);
    }
  }, [canWrite, reload]);

  return {
    saveBtcAmountOverride,
    addDividend,
    deleteDividend,
    resetDb,
    isResetting,
  };
}
