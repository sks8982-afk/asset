'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbHistory, InvestmentRecord, MonthlyBudget } from '@/lib/types';
import { getCashBalanceOnDate } from '@/lib/utils';
import { todayISO } from '@/lib/date';
import { buildBuyRecords, buildSaveSummary, planTotals, type PlanRow } from '@/lib/monthly';
import { toast } from './useToast';

type MonthlySaveInput = {
  dbHistory: DbHistory;
  reload: () => Promise<void>;
  /** 저장 성공 후 (입력·수정값 초기화 등) */
  onSaved: () => void;
};

export type MonthlySaveRequest = {
  /** 이번 달 새로 넣은 돈 (monthly_budgets에 더할 금액) */
  deposit: number;
  rows: readonly PlanRow[];
  /** 매수에 쓸 수 있는 돈 = 입금 + 투자 대기 현금 */
  budget: number;
};

/** 실패한 단계 → 안내 문구 (앞 단계가 저장됐는지에 따라) */
function saveErrorMessage(step: string, savedSomething: boolean): string {
  return savedSomething
    ? `${step} 저장에 실패했습니다. 일부만 저장됐을 수 있으니 기록 탭에서 확인해 주세요.`
    : '저장하지 못했습니다. 아무것도 기록되지 않았습니다 — 로그인 상태와 인터넷 연결을 확인해 주세요.';
}

/** 입금 반영 후의 입금 목록 (잔고 스냅샷 계산용) */
function budgetsAfterDeposit(
  budgets: MonthlyBudget[],
  existing: MonthlyBudget | undefined,
  today: string,
  deposit: number,
): MonthlyBudget[] {
  if (deposit <= 0) return budgets;
  if (!existing) return [...budgets, { month_date: today, amount: deposit }];
  return budgets.map((b) => (b.id === existing.id ? { ...b, amount: Number(b.amount) + deposit } : b));
}

/**
 * 이번 달 장부 기록 (비밀번호 없음, 확인 창 한 번).
 * 1. monthly_budgets: 새로 넣은 돈만 — 이번 달(KST) 행이 있으면 더하고 없으면 오늘 날짜로 추가 (0원이면 건너뜀)
 * 2. investment_records: 수량이 있는 줄 (체결가 = 고친 값)
 * 3. batch_summaries: 차수 요약 (날짜별 삭제 때 입금 차감에 사용)
 * 4. cash_balance_snapshots: 그날 장부 현금 (입금 − 매수 + 매도 + 배당)
 * 단계마다 Supabase { error }를 확인하고, 실패하면 알린 뒤 장부를 다시 불러온다.
 */
export function useMonthlySave({ dbHistory, reload, onSaved }: MonthlySaveInput) {
  const [isSaving, setIsSaving] = useState(false);

  const saveMonth = useCallback(async ({ deposit, rows, budget }: MonthlySaveRequest): Promise<void> => {
    const today = todayISO();
    const thisMonth = today.slice(0, 7);
    const existingBudget = dbHistory.budgets.find((b) => (b.month_date || '').startsWith(thisMonth));
    const batchId = crypto.randomUUID();
    const records = buildBuyRecords(rows, { date: today, batchId, deposit });

    if (records.some((r) => !(r.price > 0))) {
      toast.error('체결가가 0원인 종목이 있습니다. 실제 체결가를 입력해 주세요.');
      return;
    }
    if (deposit <= 0 && records.length === 0) {
      toast.info('기록할 입금이나 매수가 없습니다.');
      return;
    }
    const summary = buildSaveSummary({
      month: Number(thisMonth.slice(5)),
      deposit,
      rows,
      budget,
      addsToExistingMonth: existingBudget != null,
    });
    if (!window.confirm(summary)) return;

    setIsSaving(true);
    let step = '입금';
    let savedSomething = false;
    try {
      if (deposit > 0) {
        const { error } = existingBudget
          ? await supabase
              .from('monthly_budgets')
              .update({ amount: Number(existingBudget.amount) + deposit })
              .eq('id', existingBudget.id)
          : await supabase.from('monthly_budgets').insert({ month_date: today, amount: deposit });
        if (error) throw error;
        savedSomething = true;
      }

      if (records.length > 0) {
        step = '매수 기록';
        const { error: recordsError } = await supabase.from('investment_records').insert(records);
        if (recordsError) throw recordsError;
        savedSomething = true;

        step = '차수 요약';
        const { spent } = planTotals(rows.filter((r) => r.qty > 0), budget);
        const { error: summaryError } = await supabase.from('batch_summaries').upsert(
          {
            batch_id: batchId,
            date: today,
            deposit,
            total_spent: spent,
            remaining_cash: Math.max(0, budget - spent),
          },
          { onConflict: 'batch_id' },
        );
        if (summaryError) throw summaryError;
      }

      step = '잔고 스냅샷';
      const recordsAfter: InvestmentRecord[] = [...dbHistory.records, ...records];
      const balance = getCashBalanceOnDate(
        today,
        budgetsAfterDeposit(dbHistory.budgets, existingBudget, today, deposit),
        recordsAfter,
        dbHistory.dividends,
      );
      const { error: snapshotError } = await supabase
        .from('cash_balance_snapshots')
        .upsert({ date: today, balance }, { onConflict: 'date' });
      if (snapshotError) throw snapshotError;

      toast.success('장부에 기록했습니다.');
      onSaved();
    } catch {
      toast.error(saveErrorMessage(step, savedSomething), 6000);
    } finally {
      await reload();
      setIsSaving(false);
    }
  }, [dbHistory, reload, onSaved]);

  return { isSaving, saveMonth };
}
