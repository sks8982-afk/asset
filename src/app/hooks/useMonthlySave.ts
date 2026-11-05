'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BuyPlanResult, DbHistory, InvestmentRecord, MonthlyBudget } from '@/lib/types';
import { formatNum, getCashBalanceOnDate } from '@/lib/utils';
import { todayISO } from '@/lib/date';
import { toast } from './useToast';

type MonthlySaveInput = {
  buyPlan: BuyPlanResult | null;
  dbHistory: DbHistory;
  inputBudget: number;
  reload: () => Promise<void>;
  /** 저장 성공 후 (수정한 수량 초기화 등) */
  onSaved: () => void;
};

/**
 * 이번 달 장부 기록 — 입금액 + 매수 기록 + 배치 요약 + 그날 통장 잔고 스냅샷.
 * 날짜·월은 KST 기준. 이번 달 입금이 이미 있으면 추가 입금으로 합산한다.
 */
export function useMonthlySave({ buyPlan, dbHistory, inputBudget, reload, onSaved }: MonthlySaveInput) {
  const [isSaving, setIsSaving] = useState(false);

  const saveMonthlyRecord = useCallback(async (): Promise<void> => {
    if (!buyPlan) return;
    const today = todayISO();
    const thisMonth = today.slice(0, 7);
    const monthNumber = Number(thisMonth.slice(5));
    const existingBudget = dbHistory.budgets.find((b) => b.month_date.startsWith(thisMonth));

    const confirmMsg = existingBudget
      ? `⚠️ 이미 ${monthNumber}월 기록이 있습니다.\n추가 매수로 처리하여 합산하시겠습니까?`
      : `[${monthNumber}월 장부 기록]\n\n이달의 잔여 현금: ${formatNum(buyPlan.thisMonthResidue)}원\n\n이대로 저장하시겠습니까?`;
    if (!confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      // A. 입금액 기록 (이번 달 입금이 있으면 합산)
      const { error: budgetError } = existingBudget
        ? await supabase
            .from('monthly_budgets')
            .update({ amount: Number(existingBudget.amount) + inputBudget })
            .eq('id', existingBudget.id)
        : await supabase.from('monthly_budgets').insert({ month_date: today, amount: inputBudget });
      if (budgetError) throw budgetError;

      // B. 매수 기록 (같은 날 여러 번 저장해도 차수별로 지울 수 있게 batch_id·배치별 입금액 부여)
      const batchId = crypto.randomUUID();
      const validRecords = Object.entries(buyPlan.guide)
        .map(([key, g]) => ({
          date: today,
          asset_key: key,
          price: g.price,
          quantity: g.qty,
          amount: g.spent,
          is_panic_buy: false,
          batch_id: batchId,
          batch_deposit: inputBudget,
        }))
        .filter((r) => r.quantity > 0);
      if (validRecords.length > 0) {
        const { error: recordsError } = await supabase.from('investment_records').insert(validRecords);
        if (recordsError) throw recordsError;
        const totalSpent = validRecords.reduce((s, r) => s + r.amount, 0);
        try {
          await supabase.from('batch_summaries').upsert(
            {
              batch_id: batchId,
              date: today,
              deposit: inputBudget,
              total_spent: totalSpent,
              remaining_cash: Math.max(0, inputBudget - totalSpent),
            },
            { onConflict: 'batch_id' },
          );
        } catch {
          // 테이블 없을 수 있음
        }
      }

      // C. 그날 통장 잔고 스냅샷 (입금 − 매수 + 매도 + 배당)
      const budgetsAfter: MonthlyBudget[] = existingBudget
        ? dbHistory.budgets.map((b) =>
            b.id === existingBudget.id ? { ...b, amount: Number(b.amount) + inputBudget } : b,
          )
        : [...dbHistory.budgets, { month_date: today, amount: inputBudget }];
      const recordsAfter: InvestmentRecord[] = [...dbHistory.records, ...validRecords];
      const balance = getCashBalanceOnDate(today, budgetsAfter, recordsAfter, dbHistory.dividends);
      try {
        await supabase
          .from('cash_balance_snapshots')
          .upsert({ date: today, balance }, { onConflict: 'date' });
      } catch {
        // 테이블 없을 수 있음
      }

      toast.success('저장 완료! 장부가 갱신됩니다.');
      onSaved();
    } catch {
      toast.error('저장에 실패했습니다. 로그인 상태와 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      await reload();
      setIsSaving(false);
    }
  }, [buyPlan, dbHistory, inputBudget, reload, onSaved]);

  return { isSaving, saveMonthlyRecord };
}
