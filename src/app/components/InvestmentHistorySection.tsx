'use client';

import React, { useState } from 'react';
import { History, ChevronDown, List, CalendarDays } from 'lucide-react';
import { InvestmentCalendarView } from './InvestmentCalendarView';

export type InvestmentRecord = {
  id?: string;
  date: string;
  asset_key: string;
  price: number | string;
  quantity: number | string;
  amount: number | string;
  amount_override?: number | null;
  is_panic_buy?: boolean;
  type?: 'buy' | 'sell';
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
  onSaveAmountOverride: (recordId: string, amountOverride: number | null) => Promise<void>;
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
  onSaveAmountOverride,
}: InvestmentHistorySectionProps) {
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

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
          {/* 뷰 모드 토글 */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {viewMode === 'list' && (
                <>
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
                </>
              )}
            </div>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800'
                    : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <List size={12} /> 목록
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800'
                    : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <CalendarDays size={12} /> 달력
              </button>
            </div>
          </div>

          {/* 달력 뷰 */}
          {viewMode === 'calendar' && (
            <InvestmentCalendarView
              records={allRecords}
              names={names}
              formatNum={formatNum}
            />
          )}

          {/* 목록 뷰 */}
          {viewMode === 'list' && (
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
                {records.map((r) => {
                  const effectiveAmount = Number(
                    r.amount_override ?? r.amount ?? 0,
                  );
                  const qtyNum = Number(r.quantity ?? 0);
                  const isBtc = r.asset_key === 'btc';
                  const canEditBtcAmount = isBtc && Boolean(r.id);
                  const canEditStockPrice = !isBtc && Boolean(r.id) && qtyNum > 0;
                  const effectivePriceStock =
                    qtyNum > 0 ? effectiveAmount / qtyNum : Number(r.price ?? 0);
                  const isEditing = editingRecordId === r.id;
                  const isEditingBtcAmount =
                    canEditBtcAmount && isEditing;
                  const isEditingStockPrice =
                    canEditStockPrice && isEditing;
                  return (
                    <tr
                      key={r.id ?? r.date + r.asset_key + String(r.amount)}
                      className="border-t border-slate-100 dark:border-slate-600"
                    >
                      <td className="px-3 py-2">{r.date}</td>
                      <td className="px-3 py-2">
                        {names[r.asset_key] ?? r.asset_key}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isBtc ? (
                          formatNum(Number(r.price))
                        ) : canEditStockPrice ? (
                          isEditingStockPrice ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-right text-xs"
                              value={draftValue}
                              onChange={(e) =>
                                setDraftValue(
                                  e.target.value.replace(/[^0-9]/g, '')
                                )
                              }
                              onBlur={async () => {
                                const priceNum =
                                  draftValue === ''
                                    ? null
                                    : Number(draftValue) || 0;
                                if (
                                  priceNum !== null &&
                                  priceNum >= 0 &&
                                  qtyNum > 0
                                ) {
                                  await onSaveAmountOverride(
                                    r.id!,
                                    priceNum === 0 ? null : Math.round(priceNum * qtyNum)
                                  );
                                }
                                setEditingRecordId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecordId(r.id ?? null);
                                setDraftValue(
                                  String(Math.round(effectivePriceStock))
                                );
                              }}
                              className="text-right underline decoration-dashed hover:decoration-solid text-blue-600 dark:text-blue-400"
                              title="클릭하여 단가 수정 (실제 증권사 단가 반영, 금액=단가×수량·차액은 남은 현금에 반영)"
                            >
                              {formatNum(effectivePriceStock)}
                            </button>
                          )
                        ) : (
                          formatNum(
                            r.amount_override != null
                              ? effectivePriceStock
                              : Number(r.price)
                          )
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.asset_key === 'btc'
                          ? formatDec(
                              Number(r.amount_override ?? r.amount ?? 0) /
                                Number(r.price || 1),
                            )
                          : formatNum(Number(r.quantity))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canEditBtcAmount ? (
                          isEditingBtcAmount ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-right text-xs"
                              value={draftValue}
                              onChange={(e) =>
                                setDraftValue(
                                  e.target.value.replace(/[^0-9]/g, '')
                                )
                              }
                              onBlur={async () => {
                                const num =
                                  draftValue === ''
                                    ? null
                                    : Number(draftValue) || 0;
                                if (num !== null && num >= 0) {
                                  await onSaveAmountOverride(
                                    r.id!,
                                    num === 0 ? null : num
                                  );
                                }
                                setEditingRecordId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecordId(r.id ?? null);
                                setDraftValue(
                                  String(
                                    Math.round(
                                      Number(
                                        r.amount_override ?? r.amount ?? effectiveAmount
                                      )
                                    )
                                  )
                                );
                              }}
                              className="text-right underline decoration-dashed hover:decoration-solid text-blue-600 dark:text-blue-400"
                              title="클릭하여 매수액 수정 (다른 거래소 보정, 수량 재계산)"
                            >
                              {formatNum(effectiveAmount)}
                            </button>
                          )
                        ) : (
                          formatNum(effectiveAmount)
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.is_panic_buy ? '추매' : '-'}
                      </td>
                    </tr>
                  );
                })}
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
          )}
        </div>
      )}
    </section>
  );
}
