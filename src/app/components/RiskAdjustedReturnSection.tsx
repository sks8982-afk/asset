'use client';

import React, { useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { ChartDataPoint } from '@/lib/types';

type RiskAdjustedReturnSectionProps = {
  chartHistory: ChartDataPoint[];
};

/**
 * 리스크 조정 수익 지표 (Sharpe / Sortino / Calmar).
 * 단순 수익률만 보는 것은 잘못된 의사결정을 유도함.
 * 애널리스트 관점: 10% 수익 @ 5% 변동성 > 12% 수익 @ 30% 변동성.
 */
export function RiskAdjustedReturnSection({
  chartHistory,
}: RiskAdjustedReturnSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const metrics = useMemo(() => {
    if (chartHistory.length < 3) return null;

    // 월별 수익률 시계열 계산
    const returns: number[] = [];
    for (let i = 1; i < chartHistory.length; i++) {
      const prev = Number(chartHistory[i - 1].investment) || 0;
      const cur = Number(chartHistory[i].investment) || 0;
      const deposit = Number(chartHistory[i].principal) - Number(chartHistory[i - 1].principal);
      // 순수 시장 수익률 = (이번 달 가치 - 입금액) / 지난 달 가치
      if (prev > 0) {
        const r = (cur - deposit - prev) / prev;
        if (Number.isFinite(r)) returns.push(r);
      }
    }

    if (returns.length < 3) return null;

    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // 하방 편차 (Sortino용): 음의 수익률만
    const negReturns = returns.filter((r) => r < 0);
    const downVar = negReturns.length > 0
      ? negReturns.reduce((s, r) => s + r ** 2, 0) / returns.length
      : 0;
    const downStd = Math.sqrt(downVar);

    // 연 환산
    const annualMean = mean * 12;
    const annualStd = stdDev * Math.sqrt(12);
    const annualDownStd = downStd * Math.sqrt(12);

    // 무위험 수익률 3.5% (한국 CMA/예금 수준)
    const riskFree = 0.035;

    const sharpe = annualStd > 0 ? (annualMean - riskFree) / annualStd : 0;
    const sortino = annualDownStd > 0 ? (annualMean - riskFree) / annualDownStd : 0;

    // 최대 낙폭(MDD) 계산 — Calmar용
    let peak = Number(chartHistory[0].investment) || 0;
    let mdd = 0;
    for (const p of chartHistory) {
      const v = Number(p.investment) || 0;
      if (v > peak) peak = v;
      const dd = peak > 0 ? (peak - v) / peak : 0;
      if (dd > mdd) mdd = dd;
    }
    const calmar = mdd > 0 ? annualMean / mdd : 0;

    return {
      annualMean,
      annualStd,
      sharpe,
      sortino,
      calmar,
      mdd,
      months: returns.length,
    };
  }, [chartHistory]);

  if (!metrics) return null;

  const grade = (v: number, thresholds: [number, number, number]) => {
    if (v >= thresholds[0]) return { label: '우수', color: 'text-emerald-600 dark:text-emerald-400' };
    if (v >= thresholds[1]) return { label: '양호', color: 'text-sky-600 dark:text-sky-400' };
    if (v >= thresholds[2]) return { label: '보통', color: 'text-amber-600 dark:text-amber-400' };
    return { label: '개선 필요', color: 'text-rose-500' };
  };

  const sharpeGrade = grade(metrics.sharpe, [1.5, 1.0, 0.5]);
  const sortinoGrade = grade(metrics.sortino, [2.0, 1.5, 0.75]);
  const calmarGrade = grade(metrics.calmar, [1.0, 0.5, 0.25]);

  return (
    <section className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            리스크 조정 수익 지표
          </h3>
          <span className="text-[10px] font-bold text-slate-400">({metrics.months}개월 기준)</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase">샤프 비율</p>
          <p className={`text-xl font-black ${sharpeGrade.color}`}>
            {metrics.sharpe.toFixed(2)}
          </p>
          <p className={`text-[10px] font-bold ${sharpeGrade.color}`}>{sharpeGrade.label}</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase">소르티노</p>
          <p className={`text-xl font-black ${sortinoGrade.color}`}>
            {metrics.sortino.toFixed(2)}
          </p>
          <p className={`text-[10px] font-bold ${sortinoGrade.color}`}>{sortinoGrade.label}</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase">칼마</p>
          <p className={`text-xl font-black ${calmarGrade.color}`}>
            {metrics.calmar.toFixed(2)}
          </p>
          <p className={`text-[10px] font-bold ${calmarGrade.color}`}>{calmarGrade.label}</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70">
              <p className="text-[10px] font-bold text-slate-500 uppercase">연 평균 수익률</p>
              <p className="font-black text-slate-800 dark:text-slate-200">{(metrics.annualMean * 100).toFixed(2)}%</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70">
              <p className="text-[10px] font-bold text-slate-500 uppercase">연 변동성 (표준편차)</p>
              <p className="font-black text-slate-800 dark:text-slate-200">{(metrics.annualStd * 100).toFixed(2)}%</p>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20">
              <p className="text-[10px] font-bold text-rose-600">최대 낙폭 (MDD)</p>
              <p className="font-black text-rose-700">-{(metrics.mdd * 100).toFixed(2)}%</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70">
              <p className="text-[10px] font-bold text-slate-500 uppercase">무위험 수익률 (가정)</p>
              <p className="font-black text-slate-800 dark:text-slate-200">3.5%</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1 flex items-start gap-2">
            <Info size={12} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">해석 가이드</p>
              <p>• <b>샤프</b> 1↑ 양호, 2↑ 우수 — 변동성 대비 초과 수익</p>
              <p>• <b>소르티노</b> 1.5↑ 양호 — 하락만의 리스크 대비 (상승은 괜찮음)</p>
              <p>• <b>칼마</b> 0.5↑ 양호 — MDD 대비 수익. 50% 빠진 적 있으면 연 25%↑ 나와야 1.0</p>
              <p className="mt-2">
                애널리스트 관점: 단순 수익률보다 <b>샤프/소르티노</b>가 중요.
                변동성 큰데 수익 살짝 높으면 결국 감정으로 무너집니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
