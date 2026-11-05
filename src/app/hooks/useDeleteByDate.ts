'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbHistory, InvestmentRecord, MonthlyBudget } from '@/lib/types';
import { filterBuyRecords, formatNum, getRecordAmount } from '@/lib/utils';
import { formatYearMonthKo } from '@/lib/date';
import type { RecordBatchItem } from '../components/DeleteByDateModal';
import { budgetAmount, fetchMonthBudgetRows } from './monthlyBudgetRows';
import { LEDGER_LOCKED_MESSAGE } from './useAppData';
import { toast } from './useToast';

/** 날짜+배치별로 묶은 기록 목록 (같은 날 여러 번 저장한 것을 차수별로 선택 삭제용) — 최근 날짜 먼저, 같은 날은 1차·2차… */
export function groupBatches(records: InvestmentRecord[]): RecordBatchItem[] {
  const map = new Map<string, Omit<RecordBatchItem, 'key' | 'nth'>>();
  for (const r of records) {
    const date = r.date ? r.date.substring(0, 10) : '';
    if (!date) continue;
    const batchId = r.batch_id ?? null;
    const key = `${date}|${batchId ?? 'null'}`;
    const cur = map.get(key) ?? { date, batchId, count: 0, sellCount: 0 };
    map.set(key, { ...cur, count: cur.count + 1, sellCount: cur.sellCount + (r.type === 'sell' ? 1 : 0) });
  }
  const sorted = Array.from(map.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date) || (a.batchId ?? '').localeCompare(b.batchId ?? ''));
  const perDate: Record<string, number> = {};
  return sorted.map((b) => {
    perDate[b.date] = (perDate[b.date] ?? 0) + 1;
    return { ...b, nth: perDate[b.date] };
  });
}

function parseKey(key: string): { date: string; batchId: string | null } {
  const [date, batchIdPart] = key.split('|');
  return { date, batchId: batchIdPart === 'null' ? null : batchIdPart };
}

/**
 * 배치의 입금액 — batch_summaries가 있으면 그 값, 없으면 batch_deposit, 둘 다 없는 예전 기록은 매수 합.
 * 0원도 그대로 쓴다 (입금 없이 투자 대기 현금으로만 산 차수 — 매수 합을 입금에서 빼면 안 된다).
 * 매도 기록은 입금과 무관하므로 제외한다 (매도 대금을 입금에서 빼지 않도록).
 */
export function batchDepositOf(
  dbHistory: Pick<DbHistory, 'records' | 'batchSummaries'>,
  date: string,
  batchId: string | null,
): number {
  const batchRecords = filterBuyRecords(dbHistory.records).filter((r) => {
    const bid = r.batch_id ?? null;
    return r.date?.substring(0, 10) === date && (batchId === null ? bid == null : bid === batchId);
  });
  if (batchId != null) {
    const summary = dbHistory.batchSummaries.find((s) => s.batch_id === batchId);
    if (summary) return Math.max(0, summary.deposit);
  }
  const first = batchRecords[0];
  if (first && first.batch_deposit != null && Number.isFinite(Number(first.batch_deposit))) {
    return Math.max(0, Number(first.batch_deposit));
  }
  return batchRecords.reduce((sum, r) => sum + getRecordAmount(r), 0);
}

// ─── 입금 차감 계획 (순수 함수) ───

/** 기록을 실제로 지운 차수 */
export type DeletedBatch = { key: string; date: string; deposit: number };

export type MonthSubtraction = {
  /** 'YYYY-MM' */
  month: string;
  /** 그달 입금에서 뺄 금액 */
  amount: number;
  /** 이 금액을 낸 차수 */
  keys: string[];
};

/** 실제로 지운 차수만 — 달별로 입금에서 뺄 금액 (입금이 0원인 차수는 빼지 않는다), 달 순서 */
export function planDepositSubtractions(deleted: readonly DeletedBatch[]): MonthSubtraction[] {
  const byMonth = new Map<string, MonthSubtraction>();
  for (const batch of deleted) {
    if (!(batch.deposit > 0)) continue;
    const month = batch.date.slice(0, 7);
    const cur = byMonth.get(month) ?? { month, amount: 0, keys: [] };
    byMonth.set(month, { month, amount: cur.amount + batch.deposit, keys: [...cur.keys, batch.key] });
  }
  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export type BudgetRowUpdate = { id: string; amount: number; take: number };

/**
 * 그달 입금 행에서 amount를 뺄 계획 — 첫 행부터 빼고, 행마다 0원 아래로는 내리지 않는다
 * (첫 행이 모자라면 다음 행에서). 모든 행을 다 써도 남으면 shortfall.
 */
export function planBudgetSubtraction(
  rows: readonly Pick<MonthlyBudget, 'id' | 'amount'>[],
  amount: number,
): { updates: BudgetRowUpdate[]; shortfall: number } {
  let left = Math.max(0, amount);
  const updates: BudgetRowUpdate[] = [];
  for (const row of rows) {
    if (left <= 0) break;
    const current = Math.max(0, budgetAmount(row));
    if (!row.id || current <= 0) continue;
    const take = Math.min(current, left);
    updates.push({ id: row.id, amount: current - take, take });
    left -= take;
  }
  return { updates, shortfall: left };
}

// ─── 삭제 실행 ───

export type BatchDeleteStatus = 'deleted' | 'empty' | 'failed';

export type DeleteOutcome = {
  /** 고른 차수마다 — deleted: 기록을 지움, empty: 지울 기록이 이미 없었음, failed: 삭제 요청 실패 */
  batches: { key: string; status: BatchDeleteStatus; summaryFailed: boolean }[];
  /** 입금을 뺀 달마다 — subtracted: 실제로 뺀 금액, failed: 읽기·쓰기 오류로 다 빼지 못함 */
  months: (MonthSubtraction & { subtracted: number; failed: boolean })[];
};

/** 차수 기록 삭제 — 실제로 지운 건수 (요청이 실패하면 null) */
async function deleteBatchRecords(date: string, batchId: string | null): Promise<number | null> {
  try {
    const query = supabase.from('investment_records').delete().eq('date', date);
    const { data, error } = batchId === null
      ? await query.is('batch_id', null).select('id')
      : await query.eq('batch_id', batchId).select('id');
    if (error) return null;
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return null;
  }
}

/** 차수 요약 삭제 — 성공하면 true */
async function deleteBatchSummary(batchId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('batch_summaries').delete().eq('batch_id', batchId);
    return !error;
  } catch {
    return false;
  }
}

/** 그달 입금 행을 DB에서 새로 읽어 amount만큼 뺀다 (0원 아래로는 내리지 않는다) */
async function subtractFromMonth(month: string, amount: number): Promise<{ subtracted: number; failed: boolean }> {
  let rows: MonthlyBudget[];
  try {
    rows = await fetchMonthBudgetRows(month);
  } catch {
    return { subtracted: 0, failed: true };
  }
  let subtracted = 0;
  for (const update of planBudgetSubtraction(rows, amount).updates) {
    try {
      const { data, error } = await supabase
        .from('monthly_budgets')
        .update({ amount: update.amount })
        .eq('id', update.id)
        .select('id');
      if (error || !Array.isArray(data) || data.length === 0) return { subtracted, failed: true };
    } catch {
      return { subtracted, failed: true };
    }
    subtracted += update.take;
  }
  return { subtracted, failed: false };
}

/**
 * 고른 차수 삭제.
 * 1. 차수마다 매수·매도 기록을 지우고 .select('id')로 실제로 지운 건수를 확인, 지웠으면 차수 요약도 지운다
 * 2. 실제로 기록을 지운 차수의 입금만 — 그달 입금 행을 쓰기 직전에 새로 읽어 뺀다
 * 지우지 못했거나 이미 지워져 0건이었던 차수의 입금은 건드리지 않는다 (다시 지울 때 입금이 두 번 줄지 않도록).
 * 입금은 지우기 전에 불러 둔 장부(dbHistory) 기준으로 계산한다.
 */
export async function deleteBatchesWithDeposits(
  dbHistory: Pick<DbHistory, 'records' | 'batchSummaries'>,
  keys: readonly string[],
): Promise<DeleteOutcome> {
  const batches: DeleteOutcome['batches'] = [];
  const deleted: DeletedBatch[] = [];
  for (const key of keys) {
    const { date, batchId } = parseKey(key);
    const deposit = batchDepositOf(dbHistory, date, batchId);
    const removed = await deleteBatchRecords(date, batchId);
    if (removed === null || removed === 0) {
      batches.push({ key, status: removed === null ? 'failed' : 'empty', summaryFailed: false });
      continue;
    }
    const summaryFailed = batchId !== null && !(await deleteBatchSummary(batchId));
    batches.push({ key, status: 'deleted', summaryFailed });
    deleted.push({ key, date, deposit });
  }
  const months: DeleteOutcome['months'] = [];
  for (const plan of planDepositSubtractions(deleted)) {
    months.push({ ...plan, ...(await subtractFromMonth(plan.month, plan.amount)) });
  }
  return { batches, months };
}

/** 삭제 결과 안내 — 어느 차수를 지웠는지, 그 입금을 뺐는지 */
export function describeDeleteOutcome(
  outcome: DeleteOutcome,
  labelOf: (key: string) => string,
): { tone: 'success' | 'warning' | 'error'; message: string } {
  const labels = (status: BatchDeleteStatus) =>
    outcome.batches.filter((b) => b.status === status).map((b) => labelOf(b.key));
  const deleted = labels('deleted');
  const empty = labels('empty');
  const failed = labels('failed');
  const summaryFailed = outcome.batches.filter((b) => b.summaryFailed).map((b) => labelOf(b.key));
  const monthsOk = outcome.months.every((m) => !m.failed && m.subtracted >= m.amount);
  const subtractedTotal = outcome.months.reduce((s, m) => s + m.subtracted, 0);

  if (deleted.length === 0 && empty.length === 0) {
    return {
      tone: 'error',
      message: '삭제하지 못했습니다. 기록과 입금은 그대로입니다 — 로그인 상태와 인터넷 연결을 확인해 주세요.',
    };
  }
  if (failed.length === 0 && empty.length === 0 && summaryFailed.length === 0 && monthsOk) {
    const depositNote = subtractedTotal > 0 ? ` 입금 기록에서 ${formatNum(subtractedTotal)}원을 뺐습니다.` : '';
    return { tone: 'success', message: `선택한 ${deleted.length}개 차수를 삭제했습니다.${depositNote}` };
  }

  const lines = [
    failed.length > 0 ? '일부만 처리했습니다.'
      : deleted.length === 0 ? '지울 기록이 이미 없었습니다.'
        : '삭제했지만 확인할 것이 있습니다.',
  ];
  if (deleted.length > 0) lines.push(`삭제함: ${deleted.join(', ')}`);
  for (const m of outcome.months) {
    const month = formatYearMonthKo(m.month);
    if (m.subtracted >= m.amount) {
      lines.push(`${month} 입금에서 ${formatNum(m.amount)}원을 뺐습니다.`);
    } else if (m.failed) {
      lines.push(
        m.subtracted > 0
          ? `${month} 입금에서 ${formatNum(m.amount)}원 중 ${formatNum(m.subtracted)}원만 뺐습니다 — 나머지는 입금 기록에 남아 있습니다.`
          : `${month} 입금 ${formatNum(m.amount)}원은 빼지 못했습니다 — 입금 기록에 그대로 남아 있습니다.`,
      );
    } else {
      lines.push(`${month} 입금 기록이 모자라 ${formatNum(m.amount)}원 중 ${formatNum(m.subtracted)}원만 뺐습니다.`);
    }
  }
  if (failed.length > 0) lines.push(`삭제 못 함: ${failed.join(', ')} — 기록과 입금 모두 그대로입니다.`);
  if (empty.length > 0) lines.push(`이미 지워져 있음: ${empty.join(', ')} — 입금은 건드리지 않았습니다.`);
  if (summaryFailed.length > 0) lines.push(`차수 요약을 지우지 못함: ${summaryFailed.join(', ')} — 데이터 점검에 남은 요약이 보입니다.`);
  return { tone: 'warning', message: lines.join('\n') };
}

/** 날짜·차수별 기록 삭제 (해당 월 입금액도 함께 차감) */
export function useDeleteByDate({ dbHistory, reload, canWrite }: {
  dbHistory: DbHistory;
  reload: () => Promise<void>;
  /** 장부를 제대로 불러온 상태인지 (아니면 삭제하지 않는다) */
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const inFlight = useRef(false);

  const recordBatches = useMemo(() => groupBatches(dbHistory.records), [dbHistory.records]);

  const toggleBatch = useCallback((key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setSelectedKeys([]);
  }, []);

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (selectedKeys.length === 0 || inFlight.current) return;
    if (!canWrite) {
      toast.warning(LEDGER_LOCKED_MESSAGE);
      return;
    }
    const ok = confirm(
      `선택한 ${selectedKeys.length}개 차수의 매수·매도 기록을 삭제합니다.\n그날 저장한 입금액도 함께 줄어듭니다. 되돌릴 수 없습니다.\n\n삭제할까요?`,
    );
    if (!ok) return;
    inFlight.current = true;
    setIsDeleting(true);
    try {
      const outcome = await deleteBatchesWithDeposits(dbHistory, selectedKeys);
      const labelOf = (key: string): string => {
        const batch = recordBatches.find((b) => b.key === key);
        return batch ? `${batch.date} ${batch.nth}차` : parseKey(key).date;
      };
      const { tone, message } = describeDeleteOutcome(outcome, labelOf);
      toast[tone](message, tone === 'success' ? 3500 : 12000);
      // 하나라도 지웠으면 목록이 바뀌므로 닫는다 (전부 실패했으면 선택을 남겨 다시 시도할 수 있게)
      if (outcome.batches.some((b) => b.status !== 'failed')) close();
    } finally {
      await reload();
      inFlight.current = false;
      setIsDeleting(false);
    }
  }, [selectedKeys, canWrite, dbHistory, recordBatches, reload, close]);

  return {
    open,
    openModal: () => setOpen(true),
    close,
    recordBatches,
    selectedKeys,
    toggleBatch,
    confirmDelete,
    isDeleting,
  };
}
