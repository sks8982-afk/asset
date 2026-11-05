'use client';

import React, { useState } from 'react';
import { Banknote } from 'lucide-react';
import type { MonthlyBudget } from '@/lib/types';
import { CollapsibleCard } from './ui/CollapsibleCard';
import { TABLE_WRAP_CLASS } from './ui/styles';

type DepositsHistorySectionProps = {
  budgets: MonthlyBudget[];
  formatNum: (n: number) => string;
};

/** 입금 내역 — 월별 입금 기록 (최근 순) */
export function DepositsHistorySection({ budgets, formatNum }: DepositsHistorySectionProps) {
  const [open, setOpen] = useState(false);
  const total = budgets.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  return (
    <CollapsibleCard
      title="입금 내역"
      summary={`${budgets.length}건 · 총 ${formatNum(total)}원`}
      icon={<Banknote size={18} />}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      <div className={`${TABLE_WRAP_CLASS} max-h-72 overflow-y-auto`}>
        <table className="w-full text-sm tabular-nums text-slate-700 dark:text-slate-200">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">입금일</th>
              <th className="px-3 py-2 text-right font-semibold">입금액</th>
            </tr>
          </thead>
          <tbody>
            {[...budgets].reverse().map((b) => (
              <tr key={b.id ?? b.month_date} className="border-t border-slate-100 dark:border-slate-700/60">
                <td className="px-3 py-2">{b.month_date}</td>
                <td className="px-3 py-2 text-right">{formatNum(Number(b.amount))}원</td>
              </tr>
            ))}
            {budgets.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-6 text-center text-slate-400 dark:text-slate-500">
                  기록 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </CollapsibleCard>
  );
}
