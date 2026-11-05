'use client';

import React, { useId, useState } from 'react';
import { Target } from 'lucide-react';
import { goalProgressPct, goalScenarios } from '@/lib/goal';
import { formatMonthsKo, formatYearMonthKo, todayISO } from '@/lib/date';
import { formatNum } from '@/lib/utils';
import { Card } from '../ui/Card';
import { IntegerInput } from '../ui/IntegerInput';
import { ProgressBar } from '../ui/ProgressBar';
import { INPUT_CLASS, LABEL_CLASS, NOTE_CLASS } from '../ui/styles';

type GoalCardProps = {
  totalAsset: number;
  goalAsset: number;
  monthlyBudget: number;
  onSaveGoal: (goalAsset: number) => void;
};

/** 목표 — 목표 자산 입력, 진행률, 연 4·7·10% 가정별 도달 시점 */
export function GoalCard({ totalAsset, goalAsset, monthlyBudget, onSaveGoal }: GoalCardProps) {
  const inputId = useId();
  /** 입력 중인 값 (null = 저장된 값을 그대로 보여 줌) */
  const [draft, setDraft] = useState<number | null>(null);
  const shownGoal = draft ?? goalAsset;
  const progress = goalProgressPct(totalAsset, goalAsset);
  const reached = goalAsset > 0 && totalAsset >= goalAsset;
  const scenarios = goalAsset > 0 && !reached
    ? goalScenarios({ current: totalAsset, monthly: monthlyBudget, goal: goalAsset, today: todayISO() })
    : [];

  const commit = () => {
    if (draft != null && draft !== goalAsset) onSaveGoal(draft);
    setDraft(null);
  };

  return (
    <Card title="목표" icon={<Target size={18} />}>
      <label htmlFor={inputId} className={LABEL_CLASS}>
        목표 자산
      </label>
      <div className="mt-1 flex items-center gap-1.5">
        <IntegerInput
          id={inputId}
          value={shownGoal}
          onValueChange={setDraft}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className={`${INPUT_CLASS} w-44 text-right font-bold tabular-nums`}
        />
        <span className="text-sm text-slate-500 dark:text-slate-400">원</span>
      </div>

      {goalAsset > 0 ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
            <span className="text-slate-600 dark:text-slate-300">
              현재 <span className="font-bold text-slate-900 dark:text-slate-100">{formatNum(totalAsset)}원</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{progress.toFixed(1)}%</span>
          </div>
          <ProgressBar value={progress} tone={reached ? 'emerald' : 'blue'} className="mt-2" />
        </div>
      ) : (
        <p className={`mt-4 ${NOTE_CLASS}`}>목표 자산을 입력하면 진행률과 도달 시점을 보여 줍니다.</p>
      )}

      {reached && (
        <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          목표를 넘었습니다. 위에서 다음 목표를 정할 수 있습니다.
        </p>
      )}

      {scenarios.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            매달 <span className="tabular-nums">{formatNum(monthlyBudget)}원</span>씩 넣으면
          </p>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700/60 dark:border-slate-700">
            {scenarios.map((s) => (
              <li key={s.annualRate} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm tabular-nums">
                <span className="w-14 shrink-0 font-semibold text-slate-500 dark:text-slate-400">
                  연 {Math.round(s.annualRate * 100)}%
                </span>
                {s.months == null || s.reachMonth == null ? (
                  <span className="text-slate-500 dark:text-slate-400">100년 안에 닿지 않습니다</span>
                ) : (
                  <>
                    <span className="flex-1 font-bold text-slate-900 dark:text-slate-100">{formatMonthsKo(s.months)}</span>
                    <span className="shrink-0 text-slate-600 dark:text-slate-300">{formatYearMonthKo(s.reachMonth)}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className={`mt-2 ${NOTE_CLASS}`}>세금·수수료는 반영하지 않았고, 수익률은 가정입니다.</p>
        </div>
      )}
    </Card>
  );
}
