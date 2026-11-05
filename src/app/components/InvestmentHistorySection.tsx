'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, History, List } from 'lucide-react';
import type { InvestmentRecord } from '@/lib/types';
import { InvestmentCalendarView } from './InvestmentCalendarView';
import { CollapsibleCard } from './ui/CollapsibleCard';
import { SegmentedControl } from './ui/SegmentedControl';
import { TABLE_WRAP_CLASS, inputClass } from './ui/styles';

type InvestmentHistorySectionProps = {
  records: InvestmentRecord[];
  names: Record<string, string>;
  formatNum: (n: number) => string;
  formatDec: (n: number) => string;
  onSaveAmountOverride: (recordId: string, amountOverride: number | null) => Promise<void>;
};

type View = 'list' | 'calendar';

const VIEW_OPTIONS = [
  { value: 'list', label: <><List size={12} aria-hidden="true" /> 목록</> },
  { value: 'calendar', label: <><CalendarDays size={12} aria-hidden="true" /> 달력</> },
] as const;

const FILTER_CLASS = inputClass('py-1.5 text-sm');
const LINK_CLASS = 'text-right text-blue-600 underline decoration-dashed underline-offset-2 hover:decoration-solid dark:text-blue-400';

/** 표 안에서 숫자 하나 고치기 — 빈칸이면 취소(null), Enter나 칸 밖을 누르면 확정 */
function InlineNumberEdit({ initial, label, onCommit }: {
  initial: number;
  label: string;
  onCommit: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(initial)));
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => onCommit(draft === '' ? null : Number(draft) || 0)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm tabular-nums text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
    />
  );
}

/** 투자 내역 — 매수·매도 기록 목록(월·종목 필터, 단가·매수액 보정)과 달력 */
export function InvestmentHistorySection({
  records, names, formatNum, formatDec, onSaveAmountOverride,
}: InvestmentHistorySectionProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('list');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterAsset, setFilterAsset] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const monthOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.date.slice(0, 7)))).sort().reverse(),
    [records],
  );
  const assetOptions = Object.entries(names).filter(([k]) => k !== 'cash');
  const shown = useMemo(() => {
    let list = [...records].reverse();
    if (filterMonth) list = list.filter((r) => r.date.startsWith(filterMonth));
    if (filterAsset) list = list.filter((r) => r.asset_key === filterAsset);
    return list;
  }, [records, filterMonth, filterAsset]);
  const sellCount = records.filter((r) => r.type === 'sell').length;


  return (
    <CollapsibleCard
      title="투자 내역"
      summary={`매수 ${records.length - sellCount}건 · 매도 ${sellCount}건`}
      icon={<History size={18} />}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {view === 'list' && (
            <>
              <select aria-label="월" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className={FILTER_CLASS}>
                <option value="">전체 월</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select aria-label="종목" value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)} className={FILTER_CLASS}>
                <option value="">전체 종목</option>
                {assetOptions.map(([k, name]) => (
                  <option key={k} value={k}>{name}</option>
                ))}
              </select>
            </>
          )}
        </div>
        <SegmentedControl label="보기" options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>

      {view === 'calendar' ? (
        <InvestmentCalendarView records={records} names={names} formatNum={formatNum} />
      ) : (
        <div className={`${TABLE_WRAP_CLASS} max-h-80 overflow-y-auto`}>
          <table className="w-full text-sm tabular-nums text-slate-700 dark:text-slate-200">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">날짜</th>
                <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">종목</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">단가</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">수량</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">금액</th>
                <th className="whitespace-nowrap px-3 py-2 text-center font-semibold">비고</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const amount = Number(r.amount_override ?? r.amount ?? 0);
                const qty = Number(r.quantity ?? 0);
                const isBtc = r.asset_key === 'btc';
                const editable = Boolean(r.id);
                const canEditPrice = !isBtc && editable && qty > 0;
                const canEditBtcAmount = isBtc && editable;
                const price = qty > 0 ? amount / qty : Number(r.price ?? 0);
                const isEditing = editable && editingId === r.id;
                const name = names[r.asset_key] ?? r.asset_key;
                return (
                  <tr key={r.id ?? r.date + r.asset_key + String(r.amount)} className="border-t border-slate-100 dark:border-slate-700/60">
                    <td className="whitespace-nowrap px-3 py-2">{r.date}</td>
                    <td className="whitespace-nowrap px-3 py-2">{name}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {isBtc ? (
                        formatNum(Number(r.price))
                      ) : canEditPrice ? (
                        isEditing ? (
                          <InlineNumberEdit
                            initial={price}
                            label={`${name} 단가`}
                            onCommit={async (v) => {
                              if (v !== null && v >= 0) await onSaveAmountOverride(r.id as string, v === 0 ? null : Math.round(v * qty));
                              setEditingId(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingId(r.id ?? null)}
                            className={LINK_CLASS}
                            title="눌러서 단가 수정 (실제 증권사 단가 반영, 금액 = 단가 × 수량, 차액은 남은 현금에 반영)"
                          >
                            {formatNum(price)}
                          </button>
                        )
                      ) : (
                        formatNum(r.amount_override != null ? price : Number(r.price))
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {isBtc ? formatDec(amount / Number(r.price || 1)) : formatNum(qty)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {canEditBtcAmount ? (
                        isEditing ? (
                          <InlineNumberEdit
                            initial={amount}
                            label={`${name} 매수액`}
                            onCommit={async (v) => {
                              if (v !== null && v >= 0) await onSaveAmountOverride(r.id as string, v === 0 ? null : v);
                              setEditingId(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingId(r.id ?? null)}
                            className={LINK_CLASS}
                            title="눌러서 매수액 수정 (다른 거래소 보정, 수량 재계산)"
                          >
                            {formatNum(amount)}
                          </button>
                        )
                      ) : (
                        formatNum(amount)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs">
                      {r.type === 'sell' ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">매도</span>
                      ) : r.is_panic_buy ? (
                        '추매'
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400 dark:text-slate-500">
                    기록 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleCard>
  );
}
