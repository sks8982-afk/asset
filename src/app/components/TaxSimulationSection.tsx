'use client';

import React, { useState } from 'react';
import { Calculator, ChevronDown, Shield } from 'lucide-react';
import type { TaxSimulation } from '@/lib/types';
import { CRYPTO_TAX_EFFECTIVE_YEAR } from '@/lib/constants';

type TaxSimulationSectionProps = {
  /** 가입 이후 누적 (calculateTaxSimulation을 연도 없이 호출한 결과) */
  taxData: TaxSimulation;
  formatNum: (n: number) => string;
  /** 비트코인 보유분이나 실현 이익이 있을 때만 BTC 항목 표시 */
  showBtc: boolean;
};

export function TaxSimulationSection({
  taxData,
  formatNum,
  showBtc,
}: TaxSimulationSectionProps) {
  const [open, setOpen] = useState(false);

  const taxFreePct = taxData.isaTaxFreeLimit > 0
    ? Math.min(100, (taxData.isaTotalProfit / taxData.isaTaxFreeLimit) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow p-5 space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="font-bold text-base flex items-center gap-2">
          <Calculator className="w-5 h-5 text-violet-500" />
          ISA 세금 (가입 이후 누적)
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
              <span className="text-slate-400">
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
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">ISA 계좌 내 (손익통산 적용)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">매매 순이익 (이익-손실)</span>
                <span className={taxData.isaNetGain > 0 ? 'text-green-600 font-medium' : ''}>
                  {formatNum(taxData.isaNetGain)}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">배당 수익</span>
                <span>{formatNum(taxData.isaDividend)}원</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                <span className="text-slate-500 font-medium">ISA 총 순이익</span>
                <span className="font-bold">{formatNum(taxData.isaTotalProfit)}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">비과세 적용</span>
                <span className="text-emerald-600">-{formatNum(taxData.isaTaxFreeAmount)}원</span>
              </div>
              {taxData.isaTaxableAmount > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">분리과세 대상</span>
                    <span>{formatNum(taxData.isaTaxableAmount)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">세금 (9.9%)</span>
                    <span className="font-bold text-red-500">{formatNum(taxData.isaTax)}원</span>
                  </div>
                </>
              )}
              {taxData.isaTaxableAmount === 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">세금</span>
                  <span className="font-bold text-emerald-600">0원 (전액 비과세)</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              * 국내주식·국내주식형 ETF 손익은 비과세로 보고 제외했습니다(보수적 추정).
              해외지수·금 ETF 매매손익과 분배금만 합산합니다.
            </p>
          </div>

          {/* BTC (ISA 밖) — 보유분이나 실현 이익이 있을 때만 */}
          {showBtc && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">ISA 밖 — 비트코인</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">실현 양도차익</span>
                  <span>{formatNum(taxData.btcGain)}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">과세표준 (연 250만원 공제, {CRYPTO_TAX_EFFECTIVE_YEAR}년 귀속분부터)</span>
                  <span>{formatNum(taxData.btcTaxBase)}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">세금 (22%)</span>
                  <span className="font-bold text-red-500">{formatNum(taxData.btcTax)}원</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                * 가상자산 과세는 {CRYPTO_TAX_EFFECTIVE_YEAR}년 시행 예정이지만 추가 유예가 논의 중입니다(미확정).
              </p>
            </div>
          )}

          {/* 총 요약 + 절세 효과 */}
          <div className="space-y-2">
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-violet-700 dark:text-violet-300">
                  총 예상 세금 (누적)
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

          <p className="text-xs text-slate-400">
            * 서민형 ISA 기준 — 가입 이후 계좌 전체 순이익 400만원까지 비과세, 초과분 9.9% 분리과세.
            만기·해지 때 한 번에 정산합니다(의무가입 3년). 시뮬레이션은 참고용이며 실제 세금은 세무사와 상담하세요.
          </p>
        </div>
      )}
    </div>
  );
}
