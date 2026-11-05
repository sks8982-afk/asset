'use client';

import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { InvestmentRecord } from '@/lib/types';
import { checkSellAgainstPolicy, type PolicyViolation, type SellReason } from '@/lib/ips';
import { sellablePositionOn } from '@/lib/utils';
import { todayISO } from '@/lib/date';
import { LEDGER_LOCKED_MESSAGE } from './useAppData';
import { toast } from './useToast';

/** 매도 기록 모달이 넘기는 값 */
export type SellSubmission = {
  asset_key: string;
  quantity: number;
  price: number;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  reason: SellReason;
};

/** 'YYYY-MM-DD'에서 days일 전 날짜 (UTC 자정끼리의 달력 계산이라 실행 환경 시간대와 무관) */
function daysBefore(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
}

/** 오늘(KST) 포함 최근 30일 안에 기록된 매도 건수 */
export function countRecentSells(records: InvestmentRecord[], today: string = todayISO()): number {
  const since = daysBefore(today, 30);
  return records.filter((r) => {
    const date = (r.date || '').slice(0, 10);
    return r.type === 'sell' && date > since && date <= today;
  }).length;
}

/** 매도 단가 기준 수익률 % — 평단은 이동평균법 (평단이 없으면 0) */
export function sellRoi(avgCost: number, sellPrice: number): number {
  return avgCost > 0 ? (sellPrice / avgCost - 1) * 100 : 0;
}

/** 매도 기록 한 건 저장 — 성공하면 true */
export async function insertSellRecord(sell: SellSubmission): Promise<boolean> {
  try {
    const { error } = await supabase.from('investment_records').insert({
      date: sell.date,
      asset_key: sell.asset_key,
      price: sell.price,
      quantity: sell.quantity,
      amount: sell.amount,
      type: 'sell',
    });
    return !error;
  } catch {
    return false;
  }
}

type SellFlowInput = {
  records: InvestmentRecord[];
  reload: () => Promise<void>;
  /** 장부를 제대로 불러온 상태인지 (아니면 저장하지 않는다) */
  canWrite: boolean;
};

/**
 * 매도 흐름 — 입력 창 → 투자 원칙 점검 → (위반이면 경고 창) → 저장.
 * 저장은 한 번에 하나만 (누르고 있는 동안 두 번 눌러도 한 번만 기록), 저장되면 창을 바로 닫고 장부를 다시 불러온다.
 */
export function useSellFlow({ records, reload, canWrite }: SellFlowInput) {
  const [formOpen, setFormOpen] = useState(false);
  const [pending, setPending] = useState<SellSubmission | null>(null);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const inFlight = useRef(false);

  const clearReview = useCallback(() => {
    setPending(null);
    setViolations([]);
  }, []);

  /** 저장 — 성공하면 onInserted(창 닫기)를 먼저 부른 뒤 장부를 다시 불러온다. 실패하면 창을 그대로 둔다 */
  const persist = useCallback(async (sell: SellSubmission, onInserted: () => void): Promise<void> => {
    if (inFlight.current) return;
    if (!canWrite) {
      toast.warning(LEDGER_LOCKED_MESSAGE);
      return;
    }
    inFlight.current = true;
    setIsSaving(true);
    try {
      if (!(await insertSellRecord(sell))) {
        toast.error('매도 기록 저장에 실패했습니다. 로그인 상태와 인터넷 연결을 확인해 주세요.');
        return;
      }
      onInserted();
      toast.success('매도 기록이 저장되었습니다.');
      await reload();
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  }, [canWrite, reload]);

  /** 매도 시도 — 위반이 없으면 바로 저장, 있으면 입력 창을 닫고 경고 창으로 */
  const submitSell = useCallback(async (sell: SellSubmission): Promise<void> => {
    if (inFlight.current) return;
    const { avgCost } = sellablePositionOn(records, sell.asset_key, sell.date);
    const found = checkSellAgainstPolicy({
      assetKey: sell.asset_key,
      assetRoi: sellRoi(avgCost, sell.price),
      reason: sell.reason,
      recentSellCount30d: countRecentSells(records),
    });
    if (found.length > 0) {
      setFormOpen(false);
      setPending(sell);
      setViolations(found);
      return;
    }
    await persist(sell, () => setFormOpen(false));
  }, [records, persist]);

  const proceedAnyway = useCallback(async (): Promise<void> => {
    if (!pending) return;
    // 실패하면 경고 창을 그대로 두어 다시 시도하거나 취소할 수 있게
    await persist(pending, () => {
      clearReview();
      toast.warning('규칙 위반 매도가 기록되었습니다. 다음엔 더 신중하게.');
    });
  }, [pending, persist, clearReview]);

  const cancelSell = useCallback(() => {
    if (inFlight.current) return;
    clearReview();
    toast.success('규칙을 지켰습니다. 훌륭한 선택입니다.');
  }, [clearReview]);

  /** 저장 중에는 닫지 않는다 — 저장이 실패하면 입력값을 그대로 두고 다시 시도할 수 있게 */
  const closeForm = useCallback(() => {
    if (!inFlight.current) setFormOpen(false);
  }, []);

  return {
    formOpen,
    openForm: () => setFormOpen(true),
    closeForm,
    submitSell,
    isSaving,
    violations,
    isReviewing: violations.length > 0 && pending != null,
    proceedAnyway,
    cancelSell,
  };
}
