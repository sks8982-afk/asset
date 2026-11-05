'use client';

import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchSummary, DbHistory, InvestmentRecord, MonthlyBudget } from '@/lib/types';
import { formatNum, getCashBalanceOnDate } from '@/lib/utils';
import { todayISO } from '@/lib/date';
import {
  buildBuyRecords, buildSaveSummary, planTotals, type NewBuyRecord, type PlanRow,
} from '@/lib/monthly';
import { budgetAmount, fetchMonthBudgetRows } from './monthlyBudgetRows';
import { toast } from './useToast';

type MonthlySaveInput = {
  dbHistory: DbHistory;
  reload: () => Promise<void>;
  /** 입금·매수가 하나라도 저장된 뒤 (입력·수정값 초기화) — 그대로 다시 누르면 같은 입금이 두 번 들어간다 */
  onSaved: () => void;
};

export type MonthlySaveRequest = {
  /** 이번 달 새로 넣은 돈 (monthly_budgets에 더할 금액) */
  deposit: number;
  rows: readonly PlanRow[];
  /** 매수에 쓸 수 있는 돈 = 입금 + 투자 대기 현금 */
  budget: number;
};

/** 장부에 한 번에 쓰는 내용 */
export type MonthWrite = {
  /** 오늘 'YYYY-MM-DD' (KST) */
  today: string;
  deposit: number;
  records: readonly NewBuyRecord[];
  /** 차수 요약 (매수가 있을 때만) */
  summary: BatchSummary | null;
  /** 그날 장부 현금 (잔고 스냅샷) */
  balance: number;
};

export type MonthWriteStep = '입금' | '매수 기록';

export type MonthWriteResult =
  | { ok: true; auxFailed: boolean }
  | { ok: false; step: MonthWriteStep; savedSomething: boolean };

export const AUX_SAVE_WARNING = '보조 기록 저장에 실패했습니다 — 입금·매수는 저장됐습니다';

/** 실패한 단계 → 안내 문구 (앞 단계가 저장됐는지에 따라) */
export function saveErrorMessage(step: MonthWriteStep, savedSomething: boolean, deposit: number): string {
  if (!savedSomething) {
    return '저장하지 못했습니다. 아무것도 기록되지 않았습니다 — 로그인 상태와 인터넷 연결을 확인해 주세요.';
  }
  if (step === '매수 기록' && deposit > 0) {
    return `입금 ${formatNum(deposit)}원은 저장했지만 매수 기록은 저장하지 못했습니다. 입금은 다시 넣지 말고 매수만 다시 기록해 주세요.`;
  }
  return `${step} 저장에 실패했습니다. 일부만 저장됐을 수 있으니 기록 탭에서 확인해 주세요.`;
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
 * 이번 달 입금 행에 더한다 — 쓰기 직전에 DB에서 그달 행을 새로 읽어 (다른 기기에서 넣은 입금을 덮어쓰지 않도록)
 * 첫 행이 있으면 (새로 읽은 금액 + 입금)으로 고치고, 없으면 오늘 날짜로 추가. 실패하면 throw.
 */
async function addMonthDeposit(today: string, deposit: number): Promise<void> {
  const [first] = await fetchMonthBudgetRows(today.slice(0, 7));
  if (!first) {
    const { error } = await supabase.from('monthly_budgets').insert({ month_date: today, amount: deposit });
    if (error) throw error;
    return;
  }
  const { data, error } = await supabase
    .from('monthly_budgets')
    .update({ amount: budgetAmount(first) + deposit })
    .eq('id', first.id)
    .select('id');
  if (error) throw error;
  // 읽은 뒤 그 행이 지워졌으면 아무것도 바뀌지 않는다 — 입금이 빠진 채 성공으로 보이면 안 된다
  if (!Array.isArray(data) || data.length === 0) throw new Error('이번 달 입금 행을 고치지 못했습니다');
}

/** 차수 요약·잔고 스냅샷 — 보조 기록이라 실패해도 저장 전체를 실패로 보지 않는다. 둘 다 저장했으면 true */
async function saveAuxiliary({ today, summary, balance }: MonthWrite): Promise<boolean> {
  let ok = true;
  if (summary) {
    try {
      const { error } = await supabase.from('batch_summaries').upsert(summary, { onConflict: 'batch_id' });
      if (error) ok = false;
    } catch {
      ok = false;
    }
  }
  try {
    const { error } = await supabase.from('cash_balance_snapshots').upsert({ date: today, balance }, { onConflict: 'date' });
    if (error) ok = false;
  } catch {
    ok = false;
  }
  return ok;
}

/**
 * 이번 달 장부 쓰기.
 * 1. monthly_budgets: 새로 넣은 돈만 (0원이면 건너뜀) — addMonthDeposit
 * 2. investment_records: 수량이 있는 줄
 * 3. batch_summaries·cash_balance_snapshots: 보조 기록 (실패하면 auxFailed — 차수 입금은 매수 기록의 batch_deposit에도 있다)
 * 1·2가 실패하면 어느 단계였는지와 그 전에 저장된 것이 있는지를 돌려준다.
 */
export async function writeMonth(write: MonthWrite): Promise<MonthWriteResult> {
  let step: MonthWriteStep = '입금';
  let savedSomething = false;
  try {
    if (write.deposit > 0) {
      await addMonthDeposit(write.today, write.deposit);
      savedSomething = true;
    }
    if (write.records.length > 0) {
      step = '매수 기록';
      const { error } = await supabase.from('investment_records').insert(write.records);
      if (error) throw error;
      savedSomething = true;
    }
  } catch {
    return { ok: false, step, savedSomething };
  }
  return { ok: true, auxFailed: !(await saveAuxiliary(write)) };
}

/**
 * 이번 달 장부 기록 (비밀번호 없음, 확인 창 한 번). 쓰는 순서는 writeMonth.
 * 저장이 끝나면(일부만 저장돼도) 장부를 다시 불러온다.
 */
export function useMonthlySave({ dbHistory, reload, onSaved }: MonthlySaveInput) {
  const [isSaving, setIsSaving] = useState(false);
  const inFlight = useRef(false);

  const saveMonth = useCallback(async ({ deposit, rows, budget }: MonthlySaveRequest): Promise<void> => {
    if (inFlight.current) return;
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
    const confirmText = buildSaveSummary({
      month: Number(thisMonth.slice(5)),
      deposit,
      rows,
      budget,
      addsToExistingMonth: existingBudget != null,
    });
    if (!window.confirm(confirmText)) return;

    const { spent } = planTotals(rows.filter((r) => r.qty > 0), budget);
    const recordsAfter: InvestmentRecord[] = [...dbHistory.records, ...records];
    const write: MonthWrite = {
      today,
      deposit,
      records,
      summary: records.length > 0
        ? { batch_id: batchId, date: today, deposit, total_spent: spent, remaining_cash: Math.max(0, budget - spent) }
        : null,
      balance: getCashBalanceOnDate(
        today,
        budgetsAfterDeposit(dbHistory.budgets, existingBudget, today, deposit),
        recordsAfter,
        dbHistory.dividends,
      ),
    };

    inFlight.current = true;
    setIsSaving(true);
    try {
      const result = await writeMonth(write);
      if (result.ok) {
        toast.success('장부에 기록했습니다.');
        if (result.auxFailed) toast.warning(AUX_SAVE_WARNING, 6000);
      } else {
        toast.error(saveErrorMessage(result.step, result.savedSomething, deposit), 8000);
      }
      if (result.ok || result.savedSomething) onSaved();
    } finally {
      await reload();
      inFlight.current = false;
      setIsSaving(false);
    }
  }, [dbHistory, reload, onSaved]);

  return { isSaving, saveMonth };
}
