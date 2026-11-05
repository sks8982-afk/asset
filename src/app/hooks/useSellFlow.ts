'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AssetPortfolio, InvestmentRecord } from '@/lib/types';
import { checkSellAgainstPolicy, type PolicyViolation, type SellReason } from '@/lib/ips';
import { todayISO } from '@/lib/date';
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

type SellFlowInput = {
  records: InvestmentRecord[];
  portfolio: Record<string, AssetPortfolio>;
  reload: () => Promise<void>;
};

/**
 * 매도 흐름 — 투자 원칙 점검 → (위반이면 경고 모달) → 저장.
 */
export function useSellFlow({ records, portfolio, reload }: SellFlowInput) {
  const [pending, setPending] = useState<SellSubmission | null>(null);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);

  const persist = useCallback(async (sell: SellSubmission): Promise<void> => {
    try {
      const { error } = await supabase.from('investment_records').insert({
        date: sell.date,
        asset_key: sell.asset_key,
        price: sell.price,
        quantity: sell.quantity,
        amount: sell.amount,
        type: 'sell',
      });
      if (error) throw error;
      toast.success('매도 기록이 저장되었습니다.');
      await reload();
    } catch {
      toast.error('매도 기록 저장에 실패했습니다.');
    }
  }, [reload]);

  /** 매도 시도 — 위반이 없으면 바로 저장 */
  const submitSell = useCallback(async (sell: SellSubmission): Promise<void> => {
    const found = checkSellAgainstPolicy({
      assetKey: sell.asset_key,
      assetRoi: sellRoi(portfolio[sell.asset_key]?.avg ?? 0, sell.price),
      reason: sell.reason,
      recentSellCount30d: countRecentSells(records),
    });
    if (found.length > 0) {
      setPending(sell);
      setViolations(found);
      return;
    }
    await persist(sell);
  }, [portfolio, records, persist]);

  const clear = () => {
    setPending(null);
    setViolations([]);
  };

  const proceedAnyway = async (): Promise<void> => {
    if (pending) {
      await persist(pending);
      toast.warning('규칙 위반 매도가 기록되었습니다. 다음엔 더 신중하게.');
    }
    clear();
  };

  const cancelSell = () => {
    clear();
    toast.success('규칙을 지켰습니다. 훌륭한 선택입니다.');
  };

  return {
    submitSell,
    violations,
    isReviewing: violations.length > 0 && pending != null,
    proceedAnyway,
    cancelSell,
  };
}
