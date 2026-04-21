'use client';

import React, { useMemo, useState } from 'react';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';

type GoalScenariosSectionProps = {
  totalAsset: number;
  monthlyDeposit: number;
  goalAsset: number;
  formatNum: (n: number) => string;
};

const SCENARIOS = [
  { key: 'pessimistic', label: '보수', annualReturn: 0.04, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' },
  { key: 'balanced',    label: '균형', annualReturn: 0.07, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' },
  { key: 'optimistic',  label: '낙관', annualReturn: 0.10, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
];

/**
 * 3가지 시나리오(보수/균형/낙관)로 목표 달성 시점 예측.
 * - 복리 계산: 현재자산 × (1+r)^n + 월납입 × [(1+r/12)^n - 1] / (r/12)
 * - 단일 시나리오보다 기대치 분산시켜 감정 기복 완화
 */
export function GoalScenariosSection({
  totalAsset,
  monthlyDeposit,
  goalAsset,
  formatNum,
}: GoalScenariosSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const projections = useMemo(() => {
    if (totalAsset >= goalAsset) {
      return SCENARIOS.map((s) => ({ ...s, months: 0, finalAsset: totalAsset, achieved: true }));
    }
    if (monthlyDeposit <= 0) return [];

    return SCENARIOS.map((s) => {
      const monthlyRate = s.annualReturn / 12;
      // n달 후 자산 = P×(1+r)^n + D × ((1+r)^n - 1) / r
      // 목표 달성까지 필요한 n 찾기 (이진 탐색)
      let lo = 0;
      let hi = 12 * 50; // 50년 max
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        const fv = totalAsset * Math.pow(1 + monthlyRate, mid)
          + monthlyDeposit * (Math.pow(1 + monthlyRate, mid) - 1) / monthlyRate;
        if (fv < goalAsset) lo = mid;
        else hi = mid;
      }
      const months = Math.ceil(hi);
      const finalAsset = totalAsset * Math.pow(1 + monthlyRate, months)
        + monthlyDeposit * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
      return { ...s, months, finalAsset, achieved: false };
    });
  }, [totalAsset, monthlyDeposit, goalAsset]);

  if (projections.length === 0) return null;

  return (
    <section className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Target size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            목표 시나리오 (3가지)
          </h3>
          <span className="text-[10px] font-bold text-slate-400">목표 {formatNum(goalAsset)}원</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {projections.map((p) => {
          if (p.achieved) {
            return (
              <div key={p.key} className={`p-3 rounded-2xl border ${p.bg}`}>
                <p className={`text-[10px] font-bold uppercase ${p.color}`}>{p.label} (연 {(p.annualReturn * 100).toFixed(0)}%)</p>
                <p className="text-lg font-black text-emerald-600 mt-1">🎉 이미 달성</p>
              </div>
            );
          }
          const years = Math.floor(p.months / 12);
          const months = p.months % 12;
          return (
            <div key={p.key} className={`p-3 rounded-2xl border ${p.bg}`}>
              <p className={`text-[10px] font-bold uppercase ${p.color}`}>{p.label} (연 {(p.annualReturn * 100).toFixed(0)}%)</p>
              <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {years > 0 && `${years}년 `}
                {months > 0 && `${months}개월`}
                {years === 0 && months === 0 && '1개월 내'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                약 {formatNum(p.finalAsset)}원
              </p>
            </div>
          );
        })}
      </div>

      {expanded && (
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
          <p>• <b>보수 (연 4%)</b>: 전액 채권/예금 수준 — 최악의 경우에 대한 안전판</p>
          <p>• <b>균형 (연 7%)</b>: 시장 평균 기대치 (S&P500 장기 평균 ~10%보다 낮게 설정)</p>
          <p>• <b>낙관 (연 10%)</b>: 공격적 포트폴리오의 호황기 성과</p>
          <p className="pt-1 border-t border-slate-200 dark:border-slate-700">
            월 납입 {formatNum(monthlyDeposit)}원 가정 · 복리 계산 · 세금/수수료 미반영
          </p>
        </div>
      )}
    </section>
  );
}
