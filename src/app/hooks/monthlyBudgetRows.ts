import { supabase } from '@/lib/supabase';
import { addMonthsISO } from '@/lib/monthly';
import type { MonthlyBudget } from '@/lib/types';

/**
 * 그 달('YYYY-MM', KST)의 입금 행을 DB에서 새로 읽는다 (입금일 순).
 * 입금액을 고치기 직전에 부른다 — 화면에 불러 둔 값은 다른 기기에서 바뀌었을 수 있다.
 * 읽지 못하면 throw.
 */
export async function fetchMonthBudgetRows(month: string): Promise<MonthlyBudget[]> {
  const first = `${month}-01`;
  const { data, error } = await supabase
    .from('monthly_budgets')
    .select('id, month_date, amount')
    .gte('month_date', first)
    .lt('month_date', addMonthsISO(first, 1))
    .order('month_date', { ascending: true });
  if (error) throw error;
  return Array.isArray(data) ? (data as MonthlyBudget[]) : [];
}

/** 입금 행의 금액 (숫자가 아니면 0) */
export function budgetAmount(row: Pick<MonthlyBudget, 'amount'>): number {
  const amount = Number(row.amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}
