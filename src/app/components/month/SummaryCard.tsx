import React from 'react';
import { Wallet } from 'lucide-react';
import type { MonthlyBudget } from '@/lib/types';
import { formatNum } from '@/lib/utils';
import { todayISO } from '@/lib/date';
import { MIN_MONTHS_FOR_ANNUALIZED, annualizedReturn } from '@/lib/monthly';
import { maskReturn } from '../../hooks/useHideReturns';
import { Card } from '../ui/Card';

type SummaryCardProps = {
  totalAsset: number;
  /** 누적 입금 */
  totalInvested: number;
  budgets: MonthlyBudget[];
  hideReturns: boolean;
};

function signed(value: number, text: string): string {
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${text}`;
}

/** 총자산 · 투자 원금 · 손익 (+ 투자 12개월 이후 연환산) */
export function SummaryCard({ totalAsset, totalInvested, budgets, hideReturns }: SummaryCardProps) {
  const pnl = totalAsset - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalAsset / totalInvested - 1) * 100 : 0;
  const annualized = annualizedReturn({ budgets, totalAsset, today: todayISO() });
  const tone = pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

  return (
    <Card title="내 자산" icon={<Wallet size={18} />}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-2">
          <dt className="text-xs text-slate-500 dark:text-slate-400">총자산</dt>
          <dd className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100 sm:text-3xl">
            {maskReturn(formatNum(totalAsset), hideReturns)}원
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">투자 원금</dt>
          <dd className="text-base font-bold tabular-nums text-slate-800 dark:text-slate-200">
            {formatNum(totalInvested)}원
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">손익</dt>
          <dd className={`text-base font-bold tabular-nums ${hideReturns ? 'text-slate-800 dark:text-slate-200' : tone}`}>
            {hideReturns ? '***' : `${signed(pnl, formatNum(Math.abs(pnl)))}원`}
            <span className="ml-1.5 text-sm font-semibold">
              ({hideReturns ? '***' : signed(pnlPct, `${Math.abs(pnlPct).toFixed(1)}%`)})
            </span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {!annualized.eligible
          ? `연환산 수익률은 투자 ${MIN_MONTHS_FOR_ANNUALIZED}개월 이후에 표시합니다`
          : annualized.rate == null
            ? '연환산 수익률을 계산하지 못했습니다'
            : `연환산 ${hideReturns ? '***' : signed(annualized.rate, `${Math.abs(annualized.rate * 100).toFixed(1)}%`)} (자금가중 XIRR)`}
      </p>
    </Card>
  );
}
