'use client';

import React, { useState } from 'react';
import { Calculator, ChevronDown, Shield } from 'lucide-react';
import type { TaxSimulation } from '@/lib/types';

type TaxSimulationSectionProps = {
  taxData: TaxSimulation;
  formatNum: (n: number) => string;
  currentYear: number;
};

export function TaxSimulationSection({
  taxData,
  formatNum,
  currentYear,
}: TaxSimulationSectionProps) {
  const [open, setOpen] = useState(false);

  const taxFreePct = taxData.isaTaxFreeLimit > 0
    ? Math.min(100, (taxData.isaTotalProfit / taxData.isaTaxFreeLimit) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow p-5 space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="font-bold text-base flex items-center gap-2">
          <Calculator className="w-5 h-5 text-violet-500" />
          {currentYear}년 세금 시뮬레이션
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
            서민형 ISA
          </span>
          {taxData.totalEstimatedTax > 0 && (
            <span className="text-sm font-normal text-red-400">
              (예상 {formatNum(taxData.totalEstimatedTax)}원)
            </span>
          )}
        </h2>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4">
          {/* ISA 비과세 게이지 */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                ISA 비과세 한도 사용현황
              </span>
            </div>
            <div className="h-3 bg-emerald-100 dark:bg-emerald-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  taxFreePct >= 100
                    ? 'bg-red-400'
                    : taxFreePct >= 80
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, taxFreePct)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600 dark:text-emerald-400">
                사용: {formatNum(Math.min(taxData.isaTotalProfit, taxData.isaTaxFreeLimit))}원
              </span>
              <span className="text-zinc-400">
                한도: {formatNum(taxData.isaTaxFreeLimit)}원
              </span>
            </div>
            {taxData.isaTaxFreeRemaining > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                비과세 잔여: {formatNum(taxData.isaTaxFreeRemaining)}원 — 추가 매도 시 세금 없음
              </p>
            )}
            {taxData.isaTaxFreeRemaining <= 0 && taxData.isaTotalProfit > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                비과세 한도 소진 — 초과분 {formatNum(taxData.isaTaxableAmount)}원은 9.9% 분리과세
              </p>
            )}
          </div>

          {/* ISA 계좌 상세 */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-300">ISA 계좌 내 (손익통산 적용)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">매매 순이익 (이익-손실)</span>
                <span className={taxData.isaNetGain > 0 ? 'text-green-600 font-medium' : ''}>
                  {formatNum(taxData.isaNetGain)}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">배당 수익</span>
                <span>{formatNum(taxData.isaDividend)}원</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1">
                <span className="text-zinc-500 font-medium">ISA 총 순이익</span>
                <span className="font-bold">{formatNum(taxData.isaTotalProfit)}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">비과세 적용</span>
                <span className="text-emerald-600">-{formatNum(taxData.isaTaxFreeAmount)}원</span>
              </div>
              {taxData.isaTaxableAmount > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">분리과세 대상</span>
                    <span>{formatNum(taxData.isaTaxableAmount)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">세금 (9.9%)</span>
                    <span className="font-bold text-red-500">{formatNum(taxData.isaTax)}원</span>
                  </div>
                </>
              )}
              {taxData.isaTaxableAmount === 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">세금</span>
                  <span className="font-bold text-emerald-600">0원 (전액 비과세)</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              * ISA는 손익통산 적용 — 어떤 종목에서 손실이 나도 다른 종목 이익에서 차감됩니다.
              일반 계좌에서는 이익에만 과세되므로 ISA가 유리합니다.
            </p>
          </div>

          {/* BTC (ISA 밖) */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-300">ISA 밖 — 비트코인</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">양도차익</span>
                <span>{formatNum(taxData.btcGain)}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">기본공제 (250만원)</span>
                <span>-{formatNum(Math.min(taxData.btcGain, 2500000))}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">세금 (22%)</span>
                <span className="font-bold text-red-500">{formatNum(taxData.btcTax)}원</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400">
              * 비트코인(가상자산)은 ISA 계좌에 편입 불가. 250만원 공제 후 22% 과세.
            </p>
          </div>

          {/* 총 요약 + 절세 효과 */}
          <div className="space-y-2">
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-violet-700 dark:text-violet-300">
                  {currentYear}년 총 예상 세금
                </span>
                <span className="text-xl font-bold text-violet-700 dark:text-violet-300">
                  {formatNum(taxData.totalEstimatedTax)}원
                </span>
              </div>
            </div>

            {taxData.isaSavings > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  ISA 절세 효과 (일반과세 대비)
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {formatNum(taxData.isaSavings)}원 절약
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-400">
            * 서민형 ISA 기준 (비과세 400만원, 초과 9.9% 분리과세). 의무가입 3년, 연 납입한도 2,000만원.
            시뮬레이션은 참고용이며 실제 세금은 세무사와 상담하세요.
          </p>
        </div>
      )}
    </div>
  );
}
