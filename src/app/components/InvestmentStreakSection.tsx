'use client';

import React, { useMemo } from 'react';
import { Flame } from 'lucide-react';
import type { MonthlyBudget } from '@/lib/types';
import { currentYearMonth } from '@/lib/date';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { PANEL_CLASS } from './ui/styles';

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

    // 이번 달 기록 여부 (KST)
    const currentYM = currentYearMonth();
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

  // 최근 12개월 히트맵 (KST 기준 이번 달까지)
  const last12 = useMemo(() => {
    const currentYM = currentYearMonth();
    return Array.from({ length: 12 }, (_, i) => {
      const ym = shiftMonth(currentYM, i - 11);
      return { ym, done: monthsWithDeposit.has(ym) };
    });
  }, [monthsWithDeposit]);

  const isNewRecord = streak > 0 && streak >= longest;
  const stats = [
    { label: '현재 연속', value: streak, note: isNewRecord ? '신기록' : null },
    { label: '최장 기록', value: longest, note: null },
    { label: '누적 입금월', value: totalMonths, note: null },
  ];

  return (
    <Card
      title="연속 적립"
      icon={<Flame size={18} className={streak > 0 ? 'text-amber-500' : undefined} />}
      actions={!thisMonthDone ? <Badge tone="amber">이번 달 미기록</Badge> : undefined}
    >
      <dl className="mb-4 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className={`${PANEL_CLASS} px-3 py-3`}>
            <dt className="text-xs text-slate-500 dark:text-slate-400">{s.label}</dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {s.value}
              <span className="ml-0.5 text-sm font-semibold text-slate-500 dark:text-slate-400">개월</span>
            </dd>
            {s.note && <dd className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{s.note}</dd>}
          </div>
        ))}
      </dl>

      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">최근 12개월</p>
      <ol className="grid grid-cols-12 gap-1">
        {last12.map((m) => (
          <li
            key={m.ym}
            className={`flex h-6 items-center justify-center rounded-md text-[10px] font-bold tabular-nums ${
              m.done
                ? 'bg-emerald-500 text-white dark:bg-emerald-600'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400'
            }`}
            title={`${m.ym}: ${m.done ? '입금 완료' : '미기록'}`}
          >
            <span className="sr-only">{m.ym} {m.done ? '입금 완료' : '미기록'}</span>
            <span aria-hidden="true">{Number(m.ym.slice(5))}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** 'YYYY-MM'을 delta개월 이동 (시간대와 무관한 정수 계산) */
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

function prevMonth(ym: string): string {
  return shiftMonth(ym, -1);
}

function nextMonth(ym: string): string {
  return shiftMonth(ym, 1);
}
