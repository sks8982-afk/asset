'use client';

import React from 'react';
import { History, ChevronDown } from 'lucide-react';

export type InvestmentRecord = {
  id?: string;
  date: string;
  asset_key: string;
  price: number | string;
  quantity: number | string;
  amount: number | string;
  is_panic_buy?: boolean;
};

type InvestmentHistorySectionProps = {
  open: boolean;
  onToggle: () => void;
  filterMonth: string;
  filterAsset: string;
  onFilterMonthChange: (v: string) => void;
  onFilterAssetChange: (v: string) => void;
  records: InvestmentRecord[];
  allRecords: InvestmentRecord[];
  names: Record<string, string>;
  formatNum: (n: number) => string;
  formatDec: (n: number) => string;
};

export function InvestmentHistorySection({
  open,
  onToggle,
  filterMonth,
  filterAsset,
  onFilterMonthChange,
  onFilterAssetChange,
  records,
  allRecords,
  names,
  formatNum,
  formatDec,
}: InvestmentHistorySectionProps) {
  const monthOptions = Array.from(
    new Set(allRecords.map((r) => r.date.slice(0, 7)))
  )
    .sort()
    .reverse();
  const assetOptions = Object.entries(names).filter(([k]) => k !== 'cash');

  return (
    <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left mb-4"
      >
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <History size={18} />
          매수 기록
        </h2>
        <ChevronDown
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          size={20}
        />
      </button>
      {open && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={filterMonth}
              onChange={(e) => onFilterMonthChange(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
            >
              <option value="">전체 월</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={filterAsset}
              onChange={(e) => onFilterAssetChange(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
            >
              <option value="">전체 종목</option>
              {assetOptions.map(([k, name]) => (
                <option key={k} value={k}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto max-h-[240px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600">
            <table className="w-full text-xs text-slate-700 dark:text-slate-100">
              <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 text-slate-900 dark:text-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-black">날짜</th>
                  <th className="px-3 py-2 text-left font-black">종목</th>
                  <th className="px-3 py-2 text-right font-black">단가</th>
                  <th className="px-3 py-2 text-right font-black">수량</th>
                  <th className="px-3 py-2 text-right font-black">금액</th>
                  <th className="px-3 py-2 text-center font-black">비고</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id ?? r.date + r.asset_key + r.amount}
                    className="border-t border-slate-100 dark:border-slate-600"
                  >
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">
                      {names[r.asset_key] ?? r.asset_key}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatNum(Number(r.price))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.asset_key === 'btc'
                        ? formatDec(Number(r.quantity))
                        : formatNum(Number(r.quantity))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatNum(Number(r.amount))}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.is_panic_buy ? '추매' : '-'}
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-slate-400 dark:text-slate-500"
                    >
                      기록 없음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
