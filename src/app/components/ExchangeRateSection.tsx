'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, ChevronDown } from 'lucide-react';

type ExchangeRateSectionProps = {
  currentExchangeRate: number;
  /** 해외 자산별 { key, name, qty, avgCostKrw, currentPriceKrw } */
  foreignAssets: {
    key: string;
    name: string;
    qty: number;
    costKrw: number;
    valueKrw: number;
  }[];
  formatNum: (n: number) => string;
};

export function ExchangeRateSection({
  currentExchangeRate,
  foreignAssets,
  formatNum,
}: ExchangeRateSectionProps) {
  const [open, setOpen] = useState(false);
  const [simRate, setSimRate] = useState(currentExchangeRate);

  const analysis = useMemo(() => {
    const totalCost = foreignAssets.reduce((s, a) => s + a.costKrw, 0);
    const totalValueAtCurrent = foreignAssets.reduce((s, a) => s + a.valueKrw, 0);

    // 시뮬레이션: 현재가치를 현재환율로 나눠 달러 가치를 구하고, simRate로 재환산
    const totalValueAtSim = currentExchangeRate > 0
      ? totalValueAtCurrent * (simRate / currentExchangeRate)
      : totalValueAtCurrent;

    const pnlAtCurrent = totalValueAtCurrent - totalCost;
    const pnlAtSim = totalValueAtSim - totalCost;
    const exchangeImpact = totalValueAtSim - totalValueAtCurrent;

    return {
      totalCost,
      totalValueAtCurrent,
      totalValueAtSim,
      pnlAtCurrent,
      pnlAtSim,
      exchangeImpact,
      pnlPctCurrent: totalCost > 0 ? (pnlAtCurrent / totalCost) * 100 : 0,
      pnlPctSim: totalCost > 0 ? (pnlAtSim / totalCost) * 100 : 0,
    };
  }, [foreignAssets, currentExchangeRate, simRate]);

  const rateChange = currentExchangeRate > 0
    ? ((simRate / currentExchangeRate) - 1) * 100
    : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow p-5 space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="font-bold text-base flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          환율 영향 분석
          <span className="text-sm font-normal text-zinc-400">
            (현재 {formatNum(currentExchangeRate)}원)
          </span>
        </h2>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4">
          {/* 환율 시뮬레이터 */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-zinc-500 whitespace-nowrap">환율 시뮬레이션</label>
              <input
                type="range"
                min={Math.round(currentExchangeRate * 0.8)}
                max={Math.round(currentExchangeRate * 1.2)}
                step={10}
                value={simRate}
                onChange={(e) => setSimRate(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={simRate}
                onChange={(e) => setSimRate(Number(e.target.value))}
                className="w-24 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-right"
              />
              <span className="text-sm text-zinc-500">원/$</span>
            </div>
            {simRate !== currentExchangeRate && (
              <p className={`text-xs font-medium ${rateChange >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                현재 대비 {rateChange >= 0 ? '+' : ''}{rateChange.toFixed(1)}%
                ({rateChange >= 0 ? '원화 약세' : '원화 강세'})
              </p>
            )}
          </div>

          {/* 비교 테이블 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 text-center">
              <div className="text-xs text-zinc-400 mb-1">현재 환율 기준</div>
              <div className="text-lg font-bold">{formatNum(analysis.totalValueAtCurrent)}원</div>
              <div className={`text-sm font-medium ${analysis.pnlAtCurrent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {analysis.pnlAtCurrent >= 0 ? '+' : ''}{formatNum(analysis.pnlAtCurrent)}원
                ({analysis.pnlPctCurrent.toFixed(1)}%)
              </div>
            </div>
            <div className={`rounded-xl p-4 text-center ${
              simRate !== currentExchangeRate
                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                : 'bg-zinc-50 dark:bg-zinc-800'
            }`}>
              <div className="text-xs text-zinc-400 mb-1">시뮬레이션 환율</div>
              <div className="text-lg font-bold">{formatNum(analysis.totalValueAtSim)}원</div>
              <div className={`text-sm font-medium ${analysis.pnlAtSim >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {analysis.pnlAtSim >= 0 ? '+' : ''}{formatNum(analysis.pnlAtSim)}원
                ({analysis.pnlPctSim.toFixed(1)}%)
              </div>
            </div>
          </div>

          {/* 환율 영향 금액 */}
          {simRate !== currentExchangeRate && (
            <div className={`rounded-xl p-3 text-center text-sm font-bold ${
              analysis.exchangeImpact >= 0
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              환율 변동 영향: {analysis.exchangeImpact >= 0 ? '+' : ''}{formatNum(analysis.exchangeImpact)}원
            </div>
          )}

          {/* 해외 자산별 상세 */}
          {foreignAssets.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-zinc-400">해외 자산별 환율 노출</h3>
              {foreignAssets.map((a) => {
                const valueAtSim = currentExchangeRate > 0
                  ? a.valueKrw * (simRate / currentExchangeRate)
                  : a.valueKrw;
                const diff = valueAtSim - a.valueKrw;
                return (
                  <div
                    key={a.key}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm"
                  >
                    <span className="font-medium">{a.name}</span>
                    <div className="text-right">
                      <span>{formatNum(a.valueKrw)}원</span>
                      {simRate !== currentExchangeRate && diff !== 0 && (
                        <span className={`ml-2 text-xs ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ({diff >= 0 ? '+' : ''}{formatNum(diff)})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
