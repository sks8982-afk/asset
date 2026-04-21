'use client';

import React, { useMemo, useState } from 'react';
import { Percent, TrendingUp, TrendingDown, Info } from 'lucide-react';

type RealReturnSectionProps = {
  totalAsset: number;
  totalInvested: number;
  totalDividends: number;
  cumulativeCmaInterest: number;
  oldestDepositDate: string; // YYYY-MM-DD
  formatNum: (n: number) => string;
};

/** 한국 연간 평균 CPI (물가상승률) — 2020~2025 실적 기반 보수적 추정 */
const ANNUAL_CPI = 0.032; // 3.2%

function Row({
  label,
  value,
  note,
  emphasize,
}: {
  label: string;
  value: number;
  note?: string;
  emphasize?: boolean;
}) {
  return (
    <div className={`p-3 rounded-2xl ${
      emphasize
        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700'
        : 'bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{label}</p>
        {value >= 0
          ? <TrendingUp size={12} className="text-emerald-500" />
          : <TrendingDown size={12} className="text-rose-500" />
        }
      </div>
      <p className={`text-xl font-black ${value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
      </p>
      {note && <p className="text-[10px] text-slate-500 mt-0.5">{note}</p>}
    </div>
  );
}

/**
 * 명목 vs 실질 수익률 구분 표시.
 * - 명목: 단순 (현재가치 / 투입원금 - 1) × 100
 * - 실질: 인플레이션 조정 후 구매력 기준 수익률
 * - 순수 매매 수익률: 배당/CMA이자 제외한 주식만의 성과
 */
export function RealReturnSection({
  totalAsset,
  totalInvested,
  totalDividends,
  cumulativeCmaInterest,
  oldestDepositDate,
  formatNum,
}: RealReturnSectionProps) {
  const [showInfo, setShowInfo] = useState(false);

  const metrics = useMemo(() => {
    if (totalInvested <= 0) return null;

    // 경과 년수
    const start = new Date(oldestDepositDate);
    const now = new Date();
    const years = Math.max(
      0.1,
      (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

    // 명목 수익률
    const nominalReturn = (totalAsset / totalInvested - 1) * 100;

    // 실질 수익률 (인플레이션 조정)
    // 총 물가상승 배수
    const inflationMultiplier = Math.pow(1 + ANNUAL_CPI, years);
    const realInvested = totalInvested * inflationMultiplier; // 원금을 현재가치로 환산
    const realReturn = (totalAsset / realInvested - 1) * 100;

    // 순수 매매 수익률 (배당 + CMA이자 제외)
    const pureStockValue = totalAsset - totalDividends - cumulativeCmaInterest;
    const pureStockReturn = (pureStockValue / totalInvested - 1) * 100;

    // 연평균 수익률 (CAGR)
    const cagr = (Math.pow(totalAsset / totalInvested, 1 / years) - 1) * 100;
    const realCagr = (Math.pow(totalAsset / realInvested, 1 / years) - 1) * 100;

    return {
      years,
      nominalReturn,
      realReturn,
      pureStockReturn,
      cagr,
      realCagr,
      inflationLoss: realInvested - totalInvested,
    };
  }, [totalAsset, totalInvested, totalDividends, cumulativeCmaInterest, oldestDepositDate]);

  if (!metrics) return null;

  return (
    <section className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Percent size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            명목 vs 실질 수익률
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            (경과 {metrics.years.toFixed(1)}년)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="정보"
        >
          <Info size={14} />
        </button>
      </div>

      {showInfo && (
        <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
          <p>• <b>명목 수익률</b>: 단순 숫자 기준 수익률</p>
          <p>• <b>실질 수익률</b>: 연 {(ANNUAL_CPI * 100).toFixed(1)}% 인플레이션 조정 후 구매력 기준</p>
          <p>• <b>순수 매매 수익률</b>: 배당·CMA이자 제외한 주식 자체 성과</p>
          <p>• <b>CAGR</b>: 연평균 복리 수익률 (여러 해 성과 비교용)</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Row
          label="명목 수익률"
          value={metrics.nominalReturn}
          note="숫자 기준"
        />
        <Row
          label="실질 수익률"
          value={metrics.realReturn}
          note={`인플레 -${(ANNUAL_CPI * 100).toFixed(1)}%/년`}
          emphasize
        />
        <Row
          label="순수 매매"
          value={metrics.pureStockReturn}
          note="배당·이자 제외"
        />
        <Row
          label="연평균 (명목)"
          value={metrics.cagr}
          note="CAGR"
        />
        <Row
          label="연평균 (실질)"
          value={metrics.realCagr}
          note="CAGR 실질"
        />
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">인플레 손실</p>
          <p className="text-sm font-black text-amber-800 dark:text-amber-200">
            {formatNum(metrics.inflationLoss)}원
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">원금 구매력 감소분</p>
        </div>
      </div>

      {metrics.realReturn < 0 && metrics.nominalReturn > 0 && (
        <p className="mt-3 text-[11px] font-bold text-amber-600 dark:text-amber-400 p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
          ⚠️ 명목 수익은 있지만 실질 구매력은 줄어들었습니다. 인플레를 이기려면 더 공격적 배분 필요.
        </p>
      )}
    </section>
  );
}
