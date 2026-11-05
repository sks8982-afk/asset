'use client';

import React, { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { InvestmentRecord, BatchSummary, MonthlyBudget } from '@/lib/types';
import { getRecordAmount, getRecordQty, filterBuyRecords } from '@/lib/utils';
import { CollapsibleCard } from './ui/CollapsibleCard';
import { NOTE_CLASS } from './ui/styles';

type DataIntegritySectionProps = {
  records: InvestmentRecord[];
  batchSummaries: BatchSummary[];
  budgets: MonthlyBudget[];
  formatNum: (n: number) => string;
};

type Severity = 'high' | 'medium' | 'low';

type Issue = {
  severity: Severity;
  title: string;
  detail: string;
};

const SEVERITY_LABEL: Record<Severity, string> = { high: '중요', medium: '보통', low: '참고' };

const SEVERITY_CLASS: Record<Severity, string> = {
  high: 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30',
  medium: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30',
  low: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40',
};

/**
 * 데이터 점검 (기본은 접힘).
 * - batch_summaries vs records 금액 불일치
 * - 매도가 매수보다 많아 수량이 음수인 자산
 * - 단가 누락
 * - 최근 6개월 중 매수는 있는데 입금 기록이 없는 달
 */
export function DataIntegritySection({ records, batchSummaries, budgets, formatNum }: DataIntegritySectionProps) {
  const [open, setOpen] = useState(false);

  const issues = useMemo(() => {
    const found: Issue[] = [];

    // 1. batch_summaries 금액 불일치
    for (const s of batchSummaries) {
      const batchRecords = records.filter((r) => r.batch_id === s.batch_id);
      if (batchRecords.length === 0) {
        found.push({
          severity: 'medium',
          title: '배치 요약만 남음',
          detail: `batch ${s.batch_id.slice(0, 8)} (${s.date}): 요약은 있으나 기록 없음`,
        });
        continue;
      }
      const actualSpent = batchRecords.reduce((acc, r) => acc + getRecordAmount(r), 0);
      if (Math.abs(actualSpent - s.total_spent) > 1) {
        found.push({
          severity: 'high',
          title: '배치 금액 불일치',
          detail: `batch ${s.batch_id.slice(0, 8)} (${s.date}): 요약 ${formatNum(s.total_spent)} ≠ 실제 ${formatNum(actualSpent)}`,
        });
      }
    }

    // 2. 자산별 수량 음수 (보유 현황과 같은 유효 수량 — BTC는 보정 매수액 기준)
    const byAsset: Record<string, number> = {};
    for (const r of records) {
      const qty = getRecordQty(r) || 0;
      const sign = r.type === 'sell' ? -1 : 1;
      byAsset[r.asset_key] = (byAsset[r.asset_key] ?? 0) + sign * qty;
    }
    for (const [k, qty] of Object.entries(byAsset)) {
      if (qty < -0.0001) {
        found.push({ severity: 'high', title: '수량 음수', detail: `${k}: ${qty.toFixed(4)} (매도가 매수보다 큼)` });
      }
    }

    // 3. 단가 누락
    for (const r of filterBuyRecords(records)) {
      const price = Number(r.price) || 0;
      const qty = Number(r.quantity) || 0;
      if (qty > 0 && price <= 0) {
        found.push({ severity: 'medium', title: '단가 누락', detail: `${r.date} ${r.asset_key}: 단가 0 (수량 ${qty})` });
      }
    }

    // 4. 입금액 누락 월 (최근 6개월)
    const now = new Date();
    const depositMonths = new Set(budgets.map((b) => b.month_date.substring(0, 7)));
    const recordMonths = new Set(records.map((r) => r.date.substring(0, 7)));
    for (let i = 5; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (recordMonths.has(ym) && !depositMonths.has(ym)) {
        found.push({ severity: 'low', title: '입금 기록 누락', detail: `${ym}: 매수 기록은 있으나 월별 입금액 누락` });
      }
    }

    return found;
  }, [records, batchSummaries, budgets, formatNum]);

  const high = issues.filter((i) => i.severity === 'high').length;
  const summary = issues.length === 0 ? (
    <span className="text-emerald-700 dark:text-emerald-400">이상 없음 · 기록 {records.length}건 확인</span>
  ) : (
    <span className={high > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}>
      확인할 항목 {issues.length}건
    </span>
  );

  return (
    <CollapsibleCard
      title="데이터 점검"
      summary={summary}
      icon={<ShieldCheck size={18} />}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      {issues.length === 0 ? (
        <p className={NOTE_CLASS}>
          매수·매도 기록 {records.length}건, 차수 요약 {batchSummaries.length}건, 입금 기록 {budgets.length}건을 점검했습니다. 이상이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {issues.map((issue, idx) => (
            <li key={idx} className={`rounded-xl border p-3 text-sm ${SEVERITY_CLASS[issue.severity]}`}>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                <span className="mr-1.5 text-xs text-slate-500 dark:text-slate-400">{SEVERITY_LABEL[issue.severity]}</span>
                {issue.title}
              </p>
              <p className="mt-0.5 break-words text-xs text-slate-600 dark:text-slate-300">{issue.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleCard>
  );
}
