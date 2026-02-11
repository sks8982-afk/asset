'use client';

import React from 'react';
import { Wallet, ArrowDownCircle } from 'lucide-react';

type BudgetItem = { month_date: string; amount?: number };
type MonthlyOverviewSectionProps = {
  dbHistoryBudgets: BudgetItem[];
  inputBudget: number;
  setInputBudget: (value: number) => void;
  currentExchangeRate: number;
  totalExpectedSpend: number;
  currentCashBalance: number;
  isPanicBuyMode: boolean;
  setIsPanicBuyMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  formatNum: (n: number) => string;
};

export function MonthlyOverviewSection({
  dbHistoryBudgets,
  inputBudget,
  setInputBudget,
  currentExchangeRate,
  totalExpectedSpend,
  currentCashBalance,
  isPanicBuyMode,
  setIsPanicBuyMode,
  formatNum,
}: MonthlyOverviewSectionProps) {
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const hasCurrentMonthBudget = dbHistoryBudgets.some((b) =>
    b.month_date.startsWith(currentYearMonth)
  );

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-600 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
              {hasCurrentMonthBudget
                ? '이번 달 추가 입금액'
                : '이번 달 투자 원금'}
            </p>
            <input
              type="text"
              value={inputBudget.toLocaleString()}
              onChange={(e) =>
                setInputBudget(
                  Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                )
              }
              className="bg-transparent border-none p-0 font-black text-2xl text-blue-600 dark:text-blue-400 focus:ring-0 w-40 outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span title="적용 환율">
                환율 1USD = {formatNum(currentExchangeRate)}원
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                이번 달 예상 지출: {formatNum(totalExpectedSpend)}원
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
            현재 내 통장 잔고
          </p>
          <p
            className={`text-xl font-black flex items-center gap-1 justify-end ${
              currentCashBalance < 0
                ? 'text-rose-500'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {formatNum(currentCashBalance)}원
          </p>
        </div>
      </div>

      <button
        onClick={() => setIsPanicBuyMode((prev) => !prev)}
        className={`flex-1 p-6 rounded-[2.5rem] border-2 transition-all flex items-center justify-center gap-4 group ${
          isPanicBuyMode
            ? 'bg-rose-600 border-rose-600 text-white shadow-2xl scale-105'
            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 text-slate-400 hover:border-rose-300'
        }`}
      >
        <ArrowDownCircle
          className={isPanicBuyMode ? 'animate-bounce' : ''}
          size={32}
        />
        <div className="text-left">
          <p className="text-xs font-black uppercase tracking-tighter opacity-70 leading-none mb-1">
            Smart Panic Buying
          </p>
          <p className="text-xl font-black">
            {isPanicBuyMode ? '비상금 99% 투입 중' : '추매 기회 대기'}
          </p>
        </div>
      </button>
    </div>
  );
}
