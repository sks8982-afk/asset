'use client';

import React from 'react';
import { Wallet } from 'lucide-react';
import { currentYearMonth } from '@/lib/date';

type BudgetItem = { month_date: string; amount?: number };
type MonthlyOverviewSectionProps = {
  dbHistoryBudgets: BudgetItem[];
  inputBudget: number;
  setInputBudget: (value: number) => void;
  currentExchangeRate: number;
  totalExpectedSpend: number;
  currentCashBalance: number;
  cumulativeCmaInterestToToday: number;
  cmaRate: number;
  emergencyFundAmount: number;
  formatNum: (n: number) => string;
};

export function MonthlyOverviewSection({
  dbHistoryBudgets,
  inputBudget,
  setInputBudget,
  currentExchangeRate,
  totalExpectedSpend,
  currentCashBalance,
  cumulativeCmaInterestToToday,
  cmaRate,
  emergencyFundAmount,
  formatNum,
}: MonthlyOverviewSectionProps) {
  const thisMonth = currentYearMonth();
  const hasCurrentMonthBudget = dbHistoryBudgets.some((b) =>
    b.month_date.startsWith(thisMonth)
  );
  const effectiveBalance = currentCashBalance + cumulativeCmaInterestToToday;
  const investableAmount =
    emergencyFundAmount > 0
      ? Math.max(0, effectiveBalance - emergencyFundAmount)
      : effectiveBalance;

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
              effectiveBalance < 0
                ? 'text-rose-500'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {formatNum(effectiveBalance)}원
          </p>
          {cumulativeCmaInterestToToday > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              원금 {formatNum(currentCashBalance)}원 + CMA 누적 이자 {formatNum(cumulativeCmaInterestToToday)}원
            </p>
          )}
          {cmaRate > 0 && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              연 {cmaRate}%(세전) 일별 반영
            </p>
          )}
          {emergencyFundAmount > 0 && investableAmount !== effectiveBalance && (
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1.5">
              투자 가능: {formatNum(investableAmount)}원
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1">
                (비상금 제외)
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
