'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { InvestmentRecord } from '@/lib/types';
import { todayISO } from '@/lib/date';
import { PANEL_CLASS, buttonClass } from './ui/styles';

type DaySummary = {
  date: string;
  records: InvestmentRecord[];
  totalBuy: number;
  totalSell: number;
  buyCount: number;
  sellCount: number;
  assets: string[];
};

type InvestmentCalendarViewProps = {
  records: InvestmentRecord[];
  names: Record<string, string>;
  formatNum: (n: number) => string;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function recordAmount(r: InvestmentRecord): number {
  return Number(r.amount_override ?? r.amount ?? 0);
}

/** 달력 칸에 들어갈 짧은 금액 (10만원 이상은 '만' 단위) */
function shortWon(amount: number, formatNum: (n: number) => string): string {
  return amount >= 100_000 ? `${(amount / 10_000).toFixed(0)}만` : formatNum(amount);
}

const NAV_BUTTON = 'rounded-xl p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-400 dark:hover:bg-slate-700';

/** 투자 내역 달력 — 날짜별 매수·매도 합계, 날짜를 누르면 그날 기록 */
export function InvestmentCalendarView({ records, names, formatNum }: InvestmentCalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0부터
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const todayStr = todayISO();

  const dayMap = useMemo(() => {
    const map: Record<string, DaySummary> = {};
    for (const r of records) {
      const d = r.date.slice(0, 10);
      const cur = map[d] ?? { date: d, records: [], totalBuy: 0, totalSell: 0, buyCount: 0, sellCount: 0, assets: [] };
      const amount = recordAmount(r);
      const isSell = r.type === 'sell';
      map[d] = {
        ...cur,
        records: [...cur.records, r],
        totalBuy: cur.totalBuy + (isSell ? 0 : amount),
        totalSell: cur.totalSell + (isSell ? amount : 0),
        buyCount: cur.buyCount + (isSell ? 0 : 1),
        sellCount: cur.sellCount + (isSell ? 1 : 0),
        assets: cur.assets.includes(r.asset_key) ? cur.assets : [...cur.assets, r.asset_key],
      };
    }
    return map;
  }, [records]);

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthStats = useMemo(() => {
    const days = Object.values(dayMap).filter((s) => s.date.startsWith(monthKey));
    return {
      buyTotal: days.reduce((s, d) => s + d.totalBuy, 0),
      sellTotal: days.reduce((s, d) => s + d.totalSell, 0),
      tradingDays: days.length,
    };
  }, [dayMap, monthKey]);

  // 달력 칸 (앞뒤 빈칸 포함, 7칸씩)
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  const moveMonth = (delta: number) => {
    const total = year * 12 + month + delta;
    setYear(Math.floor(total / 12));
    setMonth(((total % 12) + 12) % 12);
    setSelectedDate(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(null);
  };

  const selected = selectedDate ? dayMap[selectedDate] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달" className={NAV_BUTTON}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {year}년 {month + 1}월
          </h3>
          <button type="button" onClick={goToday} className={buttonClass('secondary', 'sm', 'px-2 py-1')}>
            오늘
          </button>
        </div>
        <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달" className={NAV_BUTTON}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className={`${PANEL_CLASS} px-2 py-3`}>
          <dt className="text-xs text-slate-500 dark:text-slate-400">매수</dt>
          <dd className="text-sm font-bold tabular-nums text-blue-700 dark:text-blue-300">{formatNum(monthStats.buyTotal)}원</dd>
        </div>
        <div className={`${PANEL_CLASS} px-2 py-3`}>
          <dt className="text-xs text-slate-500 dark:text-slate-400">매도</dt>
          <dd className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatNum(monthStats.sellTotal)}원</dd>
        </div>
        <div className={`${PANEL_CLASS} px-2 py-3`}>
          <dt className="text-xs text-slate-500 dark:text-slate-400">거래일</dt>
          <dd className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">{monthStats.tradingDays}일</dd>
        </div>
      </dl>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-900/40">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-xs font-semibold ${
                i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-slate-100 dark:border-slate-700/60">
            {week.map((day, di) => {
              if (day === null) return <div key={di} className="h-20 bg-slate-50/50 dark:bg-slate-900/20 sm:h-24" />;
              const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
              const summary = dayMap[dateStr];
              const isSelected = dateStr === selectedDate;
              const dayTone = dateStr === todayStr
                ? 'flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white'
                : di === 0 ? 'text-rose-500' : di === 6 ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400';
              const content = (
                <>
                  <span className={`block text-[11px] font-bold leading-5 ${dayTone}`}>{day}</span>
                  {summary && (
                    <span className="mt-0.5 block space-y-0.5">
                      {summary.buyCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                          <span className="truncate text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            {summary.buyCount > 1 && <span className="hidden sm:inline">{summary.buyCount}건 </span>}
                            {shortWon(summary.totalBuy, formatNum)}
                          </span>
                        </span>
                      )}
                      {summary.sellCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
                          <span className="truncate text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            {summary.sellCount > 1 && <span className="hidden sm:inline">{summary.sellCount}건 </span>}
                            {shortWon(summary.totalSell, formatNum)}
                          </span>
                        </span>
                      )}
                      <span className="flex flex-wrap items-center gap-0.5" aria-hidden="true">
                        {summary.assets.slice(0, 4).map((key) => (
                          <span key={key} className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-500" title={names[key] ?? key} />
                        ))}
                        {summary.assets.length > 4 && (
                          <span className="text-[10px] leading-none text-slate-400">+{summary.assets.length - 4}</span>
                        )}
                      </span>
                    </span>
                  )}
                </>
              );
              const cellClass = `h-20 min-w-0 p-1 text-left sm:h-24 sm:p-1.5 ${
                isSelected ? 'relative z-10 bg-blue-50 ring-2 ring-blue-300 dark:bg-blue-950/30 dark:ring-blue-700' : ''
              }`;
              return summary ? (
                <button
                  key={di}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${dateStr} 기록 ${summary.records.length}건`}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`${cellClass} align-top hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 dark:hover:bg-slate-700/40`}
                >
                  {content}
                </button>
              ) : (
                <div key={di} className={cellClass}>
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selected && (
        <div className={PANEL_CLASS}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{selectedDate}</p>
            <p className="flex gap-2 text-xs font-semibold tabular-nums">
              {selected.buyCount > 0 && <span className="text-blue-700 dark:text-blue-300">매수 {formatNum(selected.totalBuy)}원</span>}
              {selected.sellCount > 0 && <span className="text-rose-600 dark:text-rose-400">매도 {formatNum(selected.totalSell)}원</span>}
            </p>
          </div>
          <ul className="space-y-2">
            {selected.records.map((r, i) => {
              const isSell = r.type === 'sell';
              return (
                <li
                  key={r.id ?? i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`shrink-0 text-xs font-bold ${isSell ? 'text-rose-600 dark:text-rose-400' : 'text-blue-700 dark:text-blue-300'}`}>
                      {isSell ? '매도' : '매수'}
                    </span>
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{names[r.asset_key] ?? r.asset_key}</span>
                    {r.is_panic_buy && <span className="shrink-0 text-xs text-slate-500">추매</span>}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{formatNum(recordAmount(r))}원</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {Number(r.quantity)}주 × {formatNum(Number(r.price))}원
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
