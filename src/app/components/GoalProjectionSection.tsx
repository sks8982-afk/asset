'use client';

import React, { useState } from 'react';
import { Target, TrendingUp } from 'lucide-react';

type GoalProjectionSectionProps = {
  currentAsset: number;
  monthlyInvestment: number;
  totalInvested: number;
  goalAsset: number;
  formatNum: (n: number) => string;
  estimateGoalDate: (
    currentAsset: number,
    monthlyInvestment: number,
    annualReturnPct: number,
    goalAmount: number,
  ) => Date | null;
  mdd: number;
};

export function GoalProjectionSection({
  currentAsset,
  monthlyInvestment,
  totalInvested,
  goalAsset,
  formatNum,
  estimateGoalDate,
  mdd,
}: GoalProjectionSectionProps) {
  const [expectedReturn, setExpectedReturn] = useState(7);
  const totalRoi = totalInvested > 0 ? (currentAsset / totalInvested - 1) * 100 : 0;

  const milestones = [10_000_000, 50_000_000, 100_000_000, 300_000_000, 500_000_000, 1_000_000_000];
  const relevantMilestones = milestones.filter((m) => m > currentAsset);

  const goalDate = estimateGoalDate(currentAsset, monthlyInvestment, expectedReturn, goalAsset);

  const formatDate = (d: Date | null): string => {
    if (!d) return '산출 불가';
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return `${y}년 ${m}월`;
  };

  const calcMonths = (target: number) => {
    const d = estimateGoalDate(currentAsset, monthlyInvestment, expectedReturn, target);
    if (!d) return null;
    const now = new Date();
    const diff = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
    return diff;
  };

  const progressPct = goalAsset > 0 ? Math.min(100, (currentAsset / goalAsset) * 100) : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow p-5 space-y-4">
      <h2 className="font-bold text-base flex items-center gap-2">
        <Target className="w-5 h-5 text-blue-500" />
        목표 달성 예측
      </h2>

      {/* 진행률 바 */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-zinc-500">현재: {formatNum(currentAsset)}원</span>
          <span className="text-zinc-500">목표: {formatNum(goalAsset)}원</span>
        </div>
        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-right text-xs text-zinc-400 mt-1">{progressPct.toFixed(1)}% 달성</div>
      </div>

      {/* 수익률/MDD 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-400">현재 수익률</div>
          <div className={`text-lg font-bold ${totalRoi >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {totalRoi >= 0 ? '+' : ''}{totalRoi.toFixed(1)}%
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-400">MDD</div>
          <div className="text-lg font-bold text-red-500">
            -{mdd.toFixed(1)}%
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-400">월 투자액</div>
          <div className="text-lg font-bold text-blue-600">
            {formatNum(monthlyInvestment)}
          </div>
        </div>
      </div>

      {/* 예상 수익률 입력 */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-zinc-500 whitespace-nowrap">예상 연수익률</label>
        <input
          type="range"
          min={0}
          max={20}
          step={0.5}
          value={expectedReturn}
          onChange={(e) => setExpectedReturn(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm font-bold min-w-[3rem] text-right">{expectedReturn}%</span>
      </div>

      {/* 목표 달성 예상일 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span className="font-bold text-blue-700 dark:text-blue-300">
            목표 달성 예상: {formatDate(goalDate)}
          </span>
        </div>
        {goalDate && (
          <p className="text-sm text-blue-600 dark:text-blue-400">
            약 {calcMonths(goalAsset) ?? 0}개월 후 ({((calcMonths(goalAsset) ?? 0) / 12).toFixed(1)}년)
          </p>
        )}
      </div>

      {/* 마일스톤 */}
      {relevantMilestones.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-500 mb-2">마일스톤 예측</h3>
          <div className="space-y-1">
            {relevantMilestones.slice(0, 4).map((m) => {
              const months = calcMonths(m);
              return (
                <div
                  key={m}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm"
                >
                  <span className="font-medium">{formatNum(m)}원</span>
                  <span className="text-zinc-400">
                    {months != null
                      ? `${formatDate(estimateGoalDate(currentAsset, monthlyInvestment, expectedReturn, m))} (${months}개월)`
                      : '산출 불가'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
