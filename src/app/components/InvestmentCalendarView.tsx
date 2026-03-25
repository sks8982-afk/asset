'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type CalendarRecord = {
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

type DaySummary = {
  date: string;
  records: CalendarRecord[];
  totalBuy: number;
  totalSell: number;
  buyCount: number;
  sellCount: number;
  assets: string[];
};

type InvestmentCalendarViewProps = {
  records: CalendarRecord[];
  names: Record<string, string>;
  formatNum: (n: number) => string;
};

function getRecordAmount(r: CalendarRecord): number {
  return Number(r.amount_override ?? r.amount ?? 0);
}

export function InvestmentCalendarView({
  records,
  names,
  formatNum,
}: InvestmentCalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 날짜별 기록 그룹핑
  const dayMap = useMemo(() => {
    const map: Record<string, DaySummary> = {};
    for (const r of records) {
      const d = r.date.slice(0, 10);
      if (!map[d]) {
        map[d] = { date: d, records: [], totalBuy: 0, totalSell: 0, buyCount: 0, sellCount: 0, assets: [] };
      }
      map[d].records.push(r);
      const amt = getRecordAmount(r);
      if (r.type === 'sell') {
        map[d].totalSell += amt;
        map[d].sellCount++;
      } else {
        map[d].totalBuy += amt;
        map[d].buyCount++;
      }
      if (!map[d].assets.includes(r.asset_key)) {
        map[d].assets.push(r.asset_key);
      }
    }
    return map;
  }, [records]);

  // 이번 달의 모든 기록 금액 (도트 크기 비교용)
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTotal = useMemo(() => {
    return Object.entries(dayMap)
      .filter(([d]) => d.startsWith(monthKey))
      .reduce((sum, [, s]) => sum + s.totalBuy + s.totalSell, 0);
  }, [dayMap, monthKey]);

  // 달력 그리드 계산
  const firstDay = new Date(year, month, 1).getDay(); // 0=일요일
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(firstDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(null);
  };

  const selectedSummary = selectedDate ? dayMap[selectedDate] : null;

  // 이번 달 요약 통계
  const monthStats = useMemo(() => {
    let buyTotal = 0;
    let sellTotal = 0;
    let tradingDays = 0;
    Object.entries(dayMap)
      .filter(([d]) => d.startsWith(monthKey))
      .forEach(([, s]) => {
        buyTotal += s.totalBuy;
        sellTotal += s.totalSell;
        tradingDays++;
      });
    return { buyTotal, sellTotal, tradingDays };
  }, [dayMap, monthKey]);

  return (
    <div className="space-y-4">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
            {year}년 {month + 1}월
          </h3>
          <button
            onClick={goToday}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            오늘
          </button>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronRight size={18} className="text-slate-500" />
        </button>
      </div>

      {/* 월간 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
          <p className="text-[9px] font-bold text-blue-400 uppercase">매수</p>
          <p className="text-sm font-black text-blue-700 dark:text-blue-300">{formatNum(monthStats.buyTotal)}원</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center">
          <p className="text-[9px] font-bold text-rose-400 uppercase">매도</p>
          <p className="text-sm font-black text-rose-700 dark:text-rose-300">{formatNum(monthStats.sellTotal)}원</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase">거래일</p>
          <p className="text-sm font-black text-slate-700 dark:text-slate-300">{monthStats.tradingDays}일</p>
        </div>
      </div>

      {/* 달력 그리드 */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-600 overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/80">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div key={d} className={`py-2 text-center text-[10px] font-black ${
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'
            }`}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 셀 */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-slate-100 dark:border-slate-700">
            {week.map((day, di) => {
              if (day === null) {
                return <div key={di} className="h-20 sm:h-24 bg-slate-50/50 dark:bg-slate-800/30" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const summary = dayMap[dateStr];
              const isToday = dateStr === today.toISOString().slice(0, 10);
              const isSelected = dateStr === selectedDate;
              const isWeekend = di === 0 || di === 6;

              return (
                <div
                  key={di}
                  onClick={() => summary && setSelectedDate(isSelected ? null : dateStr)}
                  className={`h-20 sm:h-24 p-1 sm:p-1.5 border-r border-slate-50 dark:border-slate-800 last:border-r-0 transition-all relative ${
                    summary ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''
                  } ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-300 dark:ring-indigo-600 z-10' : ''}`}
                >
                  {/* 날짜 숫자 */}
                  <div className={`text-[11px] font-bold leading-none ${
                    isToday
                      ? 'bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center'
                      : isWeekend
                        ? di === 0 ? 'text-rose-400' : 'text-blue-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {day}
                  </div>

                  {/* 거래 표시 */}
                  {summary && (
                    <div className="mt-1 space-y-0.5">
                      {summary.buyCount > 0 && (
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 truncate">
                            {summary.buyCount > 1 ? `${summary.buyCount}건 ` : ''}
                            {monthTotal > 0 && summary.totalBuy >= 100000
                              ? `${(summary.totalBuy / 10000).toFixed(0)}만`
                              : formatNum(summary.totalBuy)}
                          </span>
                        </div>
                      )}
                      {summary.sellCount > 0 && (
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                          <span className="text-[8px] font-bold text-rose-600 dark:text-rose-400 truncate">
                            {summary.sellCount > 1 ? `${summary.sellCount}건 ` : ''}
                            {monthTotal > 0 && summary.totalSell >= 100000
                              ? `${(summary.totalSell / 10000).toFixed(0)}만`
                              : formatNum(summary.totalSell)}
                          </span>
                        </div>
                      )}
                      {/* 종목 도트 */}
                      <div className="flex gap-0.5 flex-wrap">
                        {summary.assets.slice(0, 4).map((ak) => (
                          <div
                            key={ak}
                            className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-500"
                            title={names[ak] ?? ak}
                          />
                        ))}
                        {summary.assets.length > 4 && (
                          <span className="text-[7px] text-slate-400">+{summary.assets.length - 4}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 선택된 날짜 상세 */}
      {selectedSummary && (
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">
              {selectedDate}
            </p>
            <div className="flex gap-2">
              {selectedSummary.buyCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  매수 {formatNum(selectedSummary.totalBuy)}원
                </span>
              )}
              {selectedSummary.sellCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                  매도 {formatNum(selectedSummary.totalSell)}원
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {selectedSummary.records.map((r, i) => {
              const isSell = r.type === 'sell';
              const amt = getRecordAmount(r);
              return (
                <div
                  key={r.id ?? i}
                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    isSell
                      ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800'
                      : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      isSell
                        ? 'bg-rose-200 dark:bg-rose-800 text-rose-700 dark:text-rose-300'
                        : 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                    }`}>
                      {isSell ? '매도' : '매수'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {names[r.asset_key] ?? r.asset_key}
                    </span>
                    {r.is_panic_buy && (
                      <span className="text-[8px] font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/30 px-1 rounded">추매</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                      {formatNum(amt)}원
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {Number(r.quantity)}주 × {formatNum(Number(r.price))}원
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
