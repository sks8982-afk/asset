'use client';

import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbHistory, InvestmentRecord } from '@/lib/types';
import { filterBuyRecords, getRecordAmount } from '@/lib/utils';
import type { RecordBatchItem } from '../components/DeleteByDateModal';
import { toast } from './useToast';

/** 날짜+배치별로 묶은 기록 목록 (같은 날 여러 번 저장한 것을 차수별로 선택 삭제용) */
function groupBatches(records: InvestmentRecord[]): RecordBatchItem[] {
  const map = new Map<string, Omit<RecordBatchItem, 'key'>>();
  for (const r of records) {
    const date = r.date ? r.date.substring(0, 10) : '';
    if (!date) continue;
    const batchId = r.batch_id ?? null;
    const key = `${date}|${batchId ?? 'null'}`;
    const cur = map.get(key) ?? { date, batchId, count: 0, sellCount: 0 };
    map.set(key, { ...cur, count: cur.count + 1, sellCount: cur.sellCount + (r.type === 'sell' ? 1 : 0) });
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date) || (a.batchId ?? '').localeCompare(b.batchId ?? ''));
}

function parseKey(key: string): { date: string; batchId: string | null } {
  const [date, batchIdPart] = key.split('|');
  return { date, batchId: batchIdPart === 'null' ? null : batchIdPart };
}

/**
 * 배치의 입금액 — batch_summaries가 있으면 그 값, 없으면 batch_deposit, 그것도 없으면 매수 합.
 * 매도 기록은 입금과 무관하므로 제외한다 (매도 대금을 입금에서 빼지 않도록).
 */
function batchDepositOf(dbHistory: DbHistory, date: string, batchId: string | null): number {
  const batchRecords = filterBuyRecords(dbHistory.records).filter((r) => {
    const bid = r.batch_id ?? null;
    return r.date?.substring(0, 10) === date && (batchId === null ? bid == null : bid === batchId);
  });
  if (batchId != null) {
    const summary = dbHistory.batchSummaries.find((s) => s.batch_id === batchId);
    if (summary && summary.deposit > 0) return summary.deposit;
  }
  const first = batchRecords[0];
  if (first && Number(first.batch_deposit) > 0) return Number(first.batch_deposit);
  return batchRecords.reduce((sum, r) => sum + getRecordAmount(r), 0);
}

/** 삭제한 배치의 입금액만큼 그달 입금 기록을 줄인다 */
async function subtractDeposits(dbHistory: DbHistory, keys: string[]): Promise<void> {
  const subtractByMonth: Record<string, number> = {};
  for (const key of keys) {
    const { date, batchId } = parseKey(key);
    const deposit = batchDepositOf(dbHistory, date, batchId);
    if (deposit > 0) {
      const month = date.substring(0, 7);
      subtractByMonth[month] = (subtractByMonth[month] ?? 0) + deposit;
    }
  }
  for (const [month, toSubtract] of Object.entries(subtractByMonth)) {
    const monthRows = dbHistory.budgets.filter((b) => (b.month_date || '').startsWith(month));
    if (monthRows.length === 0) continue;
    const currentTotal = monthRows.reduce((s, b) => s + Number(b.amount ?? 0), 0);
    const [first, ...rest] = monthRows;
    const { error } = await supabase
      .from('monthly_budgets')
      .update({ amount: Math.max(0, currentTotal - toSubtract) })
      .eq('id', first.id);
    if (error) throw error;
    for (const row of rest) {
      const { error: restError } = await supabase.from('monthly_budgets').update({ amount: 0 }).eq('id', row.id);
      if (restError) throw restError;
    }
  }
}

async function deleteBatches(keys: string[]): Promise<void> {
  for (const key of keys) {
    const { date, batchId } = parseKey(key);
    const query = supabase.from('investment_records').delete().eq('date', date);
    const { error } = batchId === null ? await query.is('batch_id', null) : await query.eq('batch_id', batchId);
    if (error) throw error;
    if (batchId !== null) {
      try {
        await supabase.from('batch_summaries').delete().eq('batch_id', batchId);
      } catch {
        // 테이블 없을 수 있음
      }
    }
  }
}

/** 날짜·차수별 기록 삭제 (해당 월 입금액도 함께 차감) */
export function useDeleteByDate({ dbHistory, reload }: { dbHistory: DbHistory; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const recordBatches = useMemo(() => groupBatches(dbHistory.records), [dbHistory.records]);

  const toggleBatch = useCallback((key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setSelectedKeys([]);
  }, []);

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (selectedKeys.length === 0) return;
    const ok = confirm(
      `선택한 ${selectedKeys.length}개 차수의 매수·매도 기록을 삭제합니다.\n그날 저장한 입금액도 함께 줄어듭니다. 되돌릴 수 없습니다.\n\n삭제할까요?`,
    );
    if (!ok) return;
    setIsDeleting(true);
    try {
      await subtractDeposits(dbHistory, selectedKeys);
      await deleteBatches(selectedKeys);
      toast.success(`선택한 ${selectedKeys.length}개 기록이 삭제되었습니다.`);
      close();
    } catch {
      toast.error('삭제하지 못했습니다. 로그인 상태와 인터넷 연결을 확인해 주세요.');
    } finally {
      await reload();
      setIsDeleting(false);
    }
  }, [selectedKeys, dbHistory, reload, close]);

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
