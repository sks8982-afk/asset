'use client';

import React, { useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { InvestmentRecord, BatchSummary, MonthlyBudget } from '@/lib/types';
import { getRecordAmount, filterBuyRecords } from '@/lib/utils';

type DataIntegritySectionProps = {
  records: InvestmentRecord[];
  batchSummaries: BatchSummary[];
  budgets: MonthlyBudget[];
  formatNum: (n: number) => string;
};

type Issue = {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
};

/**
 * 데이터 무결성 체크 대시보드.
 * - batch_summaries vs records 금액 불일치
 * - 매도가 없는데 수량이 음수인 자산
 * - 평단·수량 이상값
 */
export function DataIntegritySection({
  records,
  batchSummaries,
  budgets,
  formatNum,
}: DataIntegritySectionProps) {
  const [expanded, setExpanded] = useState(false);

  const issues = useMemo(() => {
    const found: Issue[] = [];

    // 1. batch_summaries 금액 불일치
    for (const s of batchSummaries) {
      const batchRecords = records.filter((r) => r.batch_id === s.batch_id);
      if (batchRecords.length === 0) {
        found.push({
          severity: 'medium',
          title: `배치 요약 고아 데이터`,
          detail: `batch ${s.batch_id.slice(0, 8)} (${s.date}): 요약은 있으나 기록 없음`,
        });
        continue;
      }
      const actualSpent = batchRecords.reduce((acc, r) => acc + getRecordAmount(r), 0);
      if (Math.abs(actualSpent - s.total_spent) > 1) {
        found.push({
          severity: 'high',
          title: `배치 금액 불일치`,
          detail: `batch ${s.batch_id.slice(0, 8)} (${s.date}): 요약 ${formatNum(s.total_spent)} ≠ 실제 ${formatNum(actualSpent)}`,
        });
      }
    }

    // 2. 자산별 수량 음수 검증
    const byAsset: Record<string, number> = {};
    for (const r of records) {
      const qty = Number(r.quantity) || 0;
      const sign = r.type === 'sell' ? -1 : 1;
      byAsset[r.asset_key] = (byAsset[r.asset_key] ?? 0) + sign * qty;
    }
    for (const [k, qty] of Object.entries(byAsset)) {
      if (qty < -0.0001) {
        found.push({
          severity: 'high',
          title: `수량 음수`,
          detail: `${k}: ${qty.toFixed(4)} (매도가 매수보다 큼)`,
        });
      }
    }

    // 3. 평단 0 or 단가 이상값
    for (const r of filterBuyRecords(records)) {
      const price = Number(r.price) || 0;
      const qty = Number(r.quantity) || 0;
      if (qty > 0 && price <= 0) {
        found.push({
          severity: 'medium',
          title: `단가 누락`,
          detail: `${r.date} ${r.asset_key}: 단가 0 (수량 ${qty})`,
        });
      }
    }

    // 4. 입금액 누락 월 체크 (최근 6개월)
    const now = new Date();
    const depositMonths = new Set(budgets.map((b) => b.month_date.substring(0, 7)));
    const recordMonths = new Set(records.map((r) => r.date.substring(0, 7)));
    for (let i = 5; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (recordMonths.has(ym) && !depositMonths.has(ym)) {
        found.push({
          severity: 'low',
          title: `입금 기록 누락`,
          detail: `${ym}: 매수 기록은 있으나 월별 입금액 누락`,
        });
      }
    }

    return found;
  }, [records, batchSummaries, budgets, formatNum]);

  if (issues.length === 0) {
    return (
      <section className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-4 flex items-center gap-2">
        <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs font-black text-emerald-800 dark:text-emerald-200">
          ✅ 데이터 무결성 점검 — 이상 없음 ({records.length}건 검증)
        </p>
      </section>
    );
  }

  const high = issues.filter((i) => i.severity === 'high').length;

  return (
    <section className={`rounded-3xl border p-4 sm:p-5 ${
      high > 0
        ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
    }`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className={high > 0 ? 'text-rose-600' : 'text-amber-600'} />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            데이터 무결성 경고
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            high > 0 ? 'bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200' : 'bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
          }`}>
            {issues.length}건
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {issues.map((i, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-xl border text-xs ${
                i.severity === 'high'
                  ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700'
                  : i.severity === 'medium'
                  ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <p className="font-black text-slate-800 dark:text-slate-200">
                [{i.severity.toUpperCase()}] {i.title}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{i.detail}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
