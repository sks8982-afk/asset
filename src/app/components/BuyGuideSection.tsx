'use client';

import React from 'react';
import { Calculator, Save, RefreshCcw, Edit3 } from 'lucide-react';

type BudgetItem = { month_date: string };
type GuideItem = {
  qty: number;
  price: number;
  drop: number;
  spent: number;
  baseQty: number;
  extraQty: number;
};

export type BuyGuideSectionProps = {
  currentMonth: number;
  isPanicBuyMode: boolean;
  onSaveClick: () => void;
  isSaving: boolean;
  dbHistoryBudgets: BudgetItem[];
  guide: Record<string, GuideItem>;
  names: Record<string, string>;
  manualEdits: Record<string, number>;
  setManualEdits: (value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  thisMonthResidue: number;
  cmaMonthlyInterest: number;
  cmaBalanceForInterest: number;
  cmaRate: number;
  formatNum: (n: number) => string;
};

export function BuyGuideSection({
  currentMonth,
  isPanicBuyMode,
  onSaveClick,
  isSaving,
  dbHistoryBudgets,
  guide,
  names,
  manualEdits,
  setManualEdits,
  thisMonthResidue,
  cmaMonthlyInterest,
  cmaBalanceForInterest,
  cmaRate,
  formatNum,
}: BuyGuideSectionProps) {
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const hasCurrentMonthBudget = dbHistoryBudgets.some((b) =>
    b.month_date.startsWith(currentYearMonth)
  );

  return (
    <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Calculator
            className="text-blue-600 dark:text-blue-400"
            size={24}
          />
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {currentMonth}월 매수 가이드 (
            {isPanicBuyMode ? '🔥풀매수' : '🟢정기'})
          </h2>
          <span className="text-[10px] text-slate-400 font-normal ml-2">
            *수량을 클릭해 수정 가능
          </span>
        </div>
        <button
          onClick={onSaveClick}
          disabled={isSaving}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-blue-500/30"
        >
          {isSaving ? (
            <RefreshCcw className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          {hasCurrentMonthBudget ? '추가 매수 기록' : '장부에 기록하기'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 relative z-10">
        {Object.keys(guide).map((k) => (
          <div
            key={k}
            className={`p-4 sm:p-6 rounded-[2rem] border transition-all ${
              isPanicBuyMode && guide[k].drop <= -10
                ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 ring-2 ring-rose-300 dark:ring-rose-600'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-600'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none">
                {names[k]}
              </p>
              <span
                className={`text-[10px] font-bold ${
                  guide[k].drop < 0
                    ? 'text-rose-500'
                    : 'text-emerald-500 dark:text-emerald-400'
                }`}
              >
                {Math.abs(guide[k].drop).toFixed(1)}%{' '}
                {guide[k].drop < 0 ? '▼ 전월비' : '▲ 전월비'}
              </span>
            </div>

            <div className="mb-2 relative group">
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  step={k === 'btc' ? '0.000001' : '1'}
                  value={Number.isFinite(guide[k].qty) ? guide[k].qty : 0}
                  onChange={(e) =>
                    setManualEdits({
                      ...manualEdits,
                      [k]: Number(e.target.value),
                    })
                  }
                  className="bg-transparent border-b border-transparent group-hover:border-slate-300 dark:group-hover:border-slate-500 focus:border-blue-500 w-24 text-4xl font-black text-slate-900 dark:text-slate-100 p-0 outline-none transition-all"
                />
                <span className="text-sm font-bold text-slate-300 dark:text-slate-500">
                  주
                </span>
                <Edit3
                  size={12}
                  className="text-slate-300 opacity-0 group-hover:opacity-100"
                />
              </div>
              {isPanicBuyMode && guide[k].extraQty > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-bold text-slate-400">
                    기본 {formatNum(guide[k].baseQty)}
                  </span>
                  <span className="text-xs font-black text-rose-500 animate-pulse">
                    + 추가 {formatNum(guide[k].extraQty)}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-4 leading-tight">
              예상 체결가: {formatNum(guide[k].price)}원<br />
              매수액: {formatNum(guide[k].spent)}원
            </p>
          </div>
        ))}
        <div className="bg-slate-900 dark:bg-slate-700 p-4 sm:p-6 rounded-[2.5rem] text-white flex flex-col justify-center shadow-xl">
          <p className="text-[10px] font-bold text-blue-400 uppercase mb-2 leading-none">
            이달의 잔여 현금 (CMA)
          </p>
          <p className="text-2xl font-black leading-none">
            {formatNum(thisMonthResidue)}원
          </p>
          {cmaMonthlyInterest > 0 && (
            <>
              <p className="text-xs text-emerald-400/90 mt-1">
                + CMA 월 예상 이자: {formatNum(cmaMonthlyInterest)}원
              </p>
              <p className="text-sm font-bold text-emerald-300 mt-0.5">
                이자 포함: {formatNum(cmaBalanceForInterest + cmaMonthlyInterest)}원
              </p>
            </>
          )}
          <div className="mt-3 pt-3 border-t border-white/10">
            {isPanicBuyMode ? (
              <>
                <p className="text-[10px] opacity-60">
                  이번달 입금액 + 통장잔고 - 총 매수액
                </p>
                <p className="text-[10px] opacity-60 text-emerald-400">
                  (비상금까지 포함해 99% 투입 기준)
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] opacity-60">
                  이번달 입금액 - 주식매수액
                </p>
                <p className="text-[10px] opacity-60 text-emerald-400">
                  (하락장 비상금 사용분 제외)
                </p>
              </>
            )}
            {cmaRate > 0 && (
              <p className="text-[10px] opacity-50 mt-1">
                통장 잔고+잔여 현금 기준 CMA 연 {cmaRate}%(세전) 월 예상 이자
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
