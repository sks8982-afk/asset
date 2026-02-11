'use client';

import React from 'react';
import { Banknote, ChevronDown } from 'lucide-react';

export type BudgetRecord = {
  id?: string;
  month_date: string;
  amount: number | string;
};

type DepositsHistorySectionProps = {
  open: boolean;
  onToggle: () => void;
  budgets: BudgetRecord[];
  formatNum: (n: number) => string;
};

export function DepositsHistorySection({
  open,
  onToggle,
  budgets,
  formatNum,
}: DepositsHistorySectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left mb-4"
      >
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Banknote size={18} />
          월별 입금 내역
        </h2>
        <ChevronDown
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          size={20}
        />
      </button>
      {open && (
        <div className="overflow-x-auto max-h-[200px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600">
          <table className="w-full text-xs text-slate-700 dark:text-slate-100">
            <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 text-slate-900 dark:text-slate-100">
              <tr>
                <th className="px-3 py-2 text-left font-black">월</th>
                <th className="px-3 py-2 text-right font-black">입금액</th>
              </tr>
            </thead>
            <tbody>
              {[...budgets].reverse().map((b) => (
                <tr
                  key={b.id ?? b.month_date}
                  className="border-t border-slate-100 dark:border-slate-600"
                >
                  <td className="px-3 py-2">{b.month_date}</td>
                  <td className="px-3 py-2 text-right">
                    {formatNum(Number(b.amount))}원
                  </td>
                </tr>
              ))}
              {budgets.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-6 text-center text-slate-400 dark:text-slate-500"
                  >
                    기록 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
