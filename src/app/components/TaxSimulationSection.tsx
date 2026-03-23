'use client';

import React, { useState } from 'react';
import { Calculator, ChevronDown } from 'lucide-react';
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
          {/* 해외주식 양도소득세 */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-300">해외주식 양도소득세</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">양도차익</span>
                <span className={taxData.foreignGain > 0 ? 'text-green-600 font-medium' : ''}>
                  {formatNum(taxData.foreignGain)}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">기본공제</span>
                <span>-{formatNum(taxData.foreignExemption)}원</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1">
                <span className="text-zinc-500">과세표준</span>
                <span className="font-medium">{formatNum(taxData.foreignTaxBase)}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">세금 (22%)</span>
                <span className="font-bold text-red-500">{formatNum(taxData.foreignTax)}원</span>
              </div>
            </div>
            {taxData.foreignGain > 0 && taxData.foreignGain <= 2500000 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                250만원 공제 범위 이내 — 올해 추가 매도 가능 여유: {formatNum(2500000 - taxData.foreignGain)}원
              </p>
            )}
            {taxData.foreignGain > 2500000 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                250만원 공제 한도 초과 — 추가 매도 시 22% 과세됩니다
              </p>
            )}
          </div>

          {/* 국내주식 (참고) */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-300">국내주식 양도차익 (참고)</h3>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">양도차익</span>
              <span>{formatNum(taxData.domesticGain)}원</span>
            </div>
            <p className="text-xs text-zinc-400">
              소액주주(종목당 10억 미만)는 비과세. 대주주 해당 시 별도 확인 필요.
            </p>
          </div>

          {/* 배당소득세 */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-300">배당소득세</h3>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">예상 세금 (15.4%)</span>
              <span className="font-bold text-red-500">{formatNum(taxData.dividendTax)}원</span>
            </div>
            <p className="text-xs text-zinc-400">
              배당소득은 원천징수(15.4%)되며, 연 2,000만원 초과 시 금융소득종합과세 대상.
            </p>
          </div>

          {/* 총 예상 세금 */}
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

          <p className="text-xs text-zinc-400">
            * 시뮬레이션 결과는 참고용이며, 실제 세금은 세무사와 상담하세요.
            매도 기록이 있을 때만 양도차익이 계산됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
