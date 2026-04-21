'use client';

import React, { useMemo } from 'react';
import { Flame, Calendar, TrendingUp } from 'lucide-react';
import type { MonthlyBudget } from '@/lib/types';

type InvestmentStreakSectionProps = {
  budgets: MonthlyBudget[];
};

/**
 * 연속 적립 스트릭 표시.
 * - 매달 입금한 월이 몇 달 연속인지 계산 → 꾸준함 동기부여
 * - 이번 달 아직 입금 안 했으면 경고 배너
 */
export function InvestmentStreakSection({ budgets }: InvestmentStreakSectionProps) {
  const { streak, longest, totalMonths, thisMonthDone, monthsWithDeposit } = useMemo(() => {
    if (budgets.length === 0) {
      return { streak: 0, longest: 0, totalMonths: 0, thisMonthDone: false, monthsWithDeposit: new Set<string>() };
    }

    const monthSet = new Set<string>();
    for (const b of budgets) {
      if (Number(b.amount) > 0) {
        monthSet.add(b.month_date.substring(0, 7));
      }
    }

    // 이번 달 기록 여부
    const currentYM = new Date().toISOString().slice(0, 7);
    const thisMonthDone = monthSet.has(currentYM);

    // 가장 오래된 입금 월 찾기
    const sortedMonths = Array.from(monthSet).sort();
    if (sortedMonths.length === 0) {
      return { streak: 0, longest: 0, totalMonths: 0, thisMonthDone, monthsWithDeposit: monthSet };
    }

    // 현재 스트릭: 이번 달(or 지난 달)부터 역순으로 연속된 월 세기
    // 이번 달 입금 아직이면 지난 달부터 시작
    const startYM = thisMonthDone ? currentYM : prevMonth(currentYM);
    let current = startYM;
    let streak = 0;
    while (monthSet.has(current)) {
      streak++;
      current = prevMonth(current);
    }

    // 최장 스트릭
    let longest = 0;
    let running = 1;
    for (let i = 1; i < sortedMonths.length; i++) {
      if (sortedMonths[i] === nextMonth(sortedMonths[i - 1])) {
        running++;
      } else {
        longest = Math.max(longest, running);
        running = 1;
      }
    }
    longest = Math.max(longest, running);

    return {
      streak,
      longest,
      totalMonths: monthSet.size,
      thisMonthDone,
      monthsWithDeposit: monthSet,
    };
  }, [budgets]);

  // 최근 12개월 히트맵
  const last12 = useMemo(() => {
    const out: { ym: string; done: boolean }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ ym, done: monthsWithDeposit.has(ym) });
    }
    return out;
  }, [monthsWithDeposit]);

  const isNewRecord = streak > 0 && streak >= longest;

  return (
    <section className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={18} className={streak > 0 ? 'text-orange-500' : 'text-slate-400'} />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            연속 적립 스트릭
          </h3>
        </div>
        {!thisMonthDone && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            ⚠️ 이번 달 미기록
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200 dark:border-orange-800">
          <p className="text-[10px] font-bold text-orange-600 dark:text-orange-300 uppercase">현재 연속</p>
          <p className="text-2xl font-black text-orange-700 dark:text-orange-200">
            {streak}<span className="text-sm ml-1">개월</span>
          </p>
          {isNewRecord && streak > 0 && (
            <p className="text-[10px] font-bold text-rose-500 mt-0.5">🏆 신기록</p>
          )}
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase">최장 기록</p>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-200">
            {longest}<span className="text-sm ml-1">개월</span>
          </p>
          <TrendingUp size={12} className="text-slate-400 mt-0.5" />
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase">누적 입금월</p>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-200">
            {totalMonths}<span className="text-sm ml-1">개월</span>
          </p>
          <Calendar size={12} className="text-slate-400 mt-0.5" />
        </div>
      </div>

      {/* 최근 12개월 히트맵 */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">최근 12개월</p>
        <div className="grid grid-cols-12 gap-1">
          {last12.map((m) => (
            <div
              key={m.ym}
              className={`h-6 rounded-md flex items-center justify-center text-[8px] font-bold ${
                m.done
                  ? 'bg-emerald-400 dark:bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
              }`}
              title={`${m.ym}: ${m.done ? '입금 완료' : '미기록'}`}
            >
              {m.ym.slice(5)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
