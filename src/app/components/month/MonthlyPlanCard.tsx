'use client';

import React, { useId } from 'react';
import { Calculator, RefreshCcw, Save } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { DbHistory, MyAccountData } from '@/lib/types';
import type { AppSettings, SettingsPatch } from '@/lib/settings';
import type { PlanRow } from '@/lib/monthly';
import { coreGroupLabel, corePercents } from '@/lib/monthly';
import { formatNum } from '@/lib/utils';
import { currentYearMonth } from '@/lib/date';
import { useMonthlyPlan } from '../../hooks/useMonthlyPlan';
import { useMonthlySave } from '../../hooks/useMonthlySave';
import { Card } from '../ui/Card';
import { IntegerInput } from '../ui/IntegerInput';

type MonthlyPlanCardProps = {
  myAccount: MyAccountData;
  dbHistory: DbHistory;
  settings: AppSettings;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
  reload: () => Promise<void>;
  /** 기록할 수 없는 이유 (장부·설정을 못 불러옴). null이면 기록 가능 */
  saveBlockedReason: string | null;
};

const INPUT_CLASS =
  'rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-right text-base font-bold tabular-nums text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

type PlanRowItemProps = {
  row: PlanRow;
  onQty: (key: string, qty: number) => void;
  onPrice: (key: string, price: number) => void;
  livePrice: number;
};

function PlanRowItem({ row, onQty, onPrice, livePrice }: PlanRowItemProps) {
  const edited = row.qty !== row.suggestedQty || row.price !== livePrice;
  return (
    <li className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{row.name}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {formatNum(row.amount)}원
        </span>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <label className="flex flex-col text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          수량
          <span className="mt-0.5 flex items-center gap-1">
            <IntegerInput
              value={row.qty}
              onValueChange={(v) => onQty(row.key, v)}
              aria-label={`${row.name} 수량`}
              className={`${INPUT_CLASS} w-16`}
            />
            <span className="text-xs text-slate-500">주</span>
          </span>
        </label>
        <span className="pb-2 text-slate-400" aria-hidden="true">×</span>
        <label className="flex flex-col text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          체결가
          <span className="mt-0.5 flex items-center gap-1">
            <IntegerInput
              value={row.price}
              onValueChange={(v) => onPrice(row.key, v)}
              aria-label={`${row.name} 체결가`}
              className={`${INPUT_CLASS} w-28`}
            />
            <span className="text-xs text-slate-500">원</span>
          </span>
        </label>
      </div>
      {edited && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          계산 {formatNum(row.suggestedQty)}주 · 현재가 {formatNum(livePrice)}원
        </p>
      )}
    </li>
  );
}

/** 이번 달 적립 — 입금액 → 70:30 정수 주 → 수량·체결가 확인 → 장부 기록 */
export function MonthlyPlanCard({
  myAccount, dbHistory, settings, updateSettings, reload, saveBlockedReason,
}: MonthlyPlanCardProps) {
  const depositId = useId();
  const thisMonth = currentYearMonth();
  const monthBudget = dbHistory.budgets
    .filter((b) => (b.month_date || '').startsWith(thisMonth))
    .reduce((s, b) => s + Number(b.amount ?? 0), 0);
  const hasMonthRow = dbHistory.budgets.some((b) => (b.month_date || '').startsWith(thisMonth));
  const plan = useMonthlyPlan({ myAccount, settings, hasMonthRow });
  const { isSaving, saveMonth } = useMonthlySave({ dbHistory, reload, onSaved: plan.reset });
  const target = corePercents(settings.coreWeights);
  const current = corePercents({ sp500: plan.drift.sp500.weight, nasdaq100: plan.drift.nasdaq100.weight });
  const { cash, totals } = plan;
  // 직접 입력한 입금액이 기본값과 다를 때만 — 이번 달 기록이 있어 자동으로 0원이 된 것은 기본값 후보가 아니다
  const canSaveAsDefault = plan.depositEdited && plan.deposit > 0 && plan.deposit !== settings.monthlyBudget;

  const saveAsDefault = () => {
    void updateSettings({ monthlyBudget: plan.deposit });
    plan.setDeposit(null);
  };

  return (
    <Card
      title={`${Number(thisMonth.slice(5))}월 적립`}
      subtitle={`S&P500 ${target.sp500} : 나스닥100 ${target.nasdaq100} · 정수 주 · 잔돈 이월`}
      icon={<Calculator size={18} />}
    >
      <div>
        <label htmlFor={depositId} className="text-xs font-bold text-slate-500 dark:text-slate-400">
          이번 달 입금액
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5">
            <IntegerInput
              id={depositId}
              value={plan.deposit}
              onValueChange={plan.setDeposit}
              className={twMerge(INPUT_CLASS, 'w-40 px-3 py-2 text-xl')}
            />
            <span className="text-sm font-semibold text-slate-500">원</span>
          </span>
          {canSaveAsDefault && (
            <button
              type="button"
              onClick={saveAsDefault}
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              기본값으로 저장
            </button>
          )}
        </div>
        {hasMonthRow && (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            이번 달 입금 기록 {formatNum(monthBudget)}원이 이미 있습니다 — 저장하면 여기에 더해집니다.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900/40">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">투자 대기 현금</span>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatNum(cash.waiting)}원
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          장부 현금 {formatNum(cash.ledgerCash)}원 − 비상금 {formatNum(cash.emergencyFund)}원
        </p>
        {cash.accruedInterest >= 1 && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            추정 CMA 이자 {formatNum(cash.accruedInterest)}원 (계산에서 제외)
          </p>
        )}
        {cash.blockedByEmergencyFund && (
          <p className="mt-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            설정의 비상금이 장부 현금보다 커서 잔돈이 투자되지 않고 있습니다.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>매수에 쓸 돈 (입금 + 대기 현금)</span>
        <span className="font-bold tabular-nums">{formatNum(plan.budget)}원</span>
      </div>
      <ul className="mt-2 space-y-2">
        {plan.rows.map((row) => (
          <PlanRowItem
            key={row.key}
            row={row}
            onQty={plan.setQty}
            onPrice={plan.setPrice}
            livePrice={myAccount.currentPriceMap[row.key] ?? 0}
          />
        ))}
      </ul>

      <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600 dark:text-slate-300">매수 합계</dt>
          <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatNum(totals.spent)}원</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className={totals.carryOver >= 0 ? 'text-slate-600 dark:text-slate-300' : 'font-semibold text-amber-700 dark:text-amber-400'}>
            {totals.carryOver >= 0 ? '다음 달로 이월' : '가용 금액 초과'}
          </dt>
          <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatNum(Math.abs(totals.carryOver))}원
          </dd>
        </div>
      </dl>

      {plan.hasCoreHoldings && (
        <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
          <p>
            현재 코어 비중 S&amp;P500 {current.sp500}% : 나스닥100 {current.nasdaq100}% (목표 {target.sp500}:{target.nasdaq100})
          </p>
          {plan.missingPrice && (
            <p>시세를 받지 못한 종목이 있어 비중이 실제와 다를 수 있습니다.</p>
          )}
          {plan.groupToBoost && (
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              목표에서 5%p 이상 벗어났습니다. 이번 달 수량을 {coreGroupLabel(plan.groupToBoost)} 쪽으로 늘리면 더 빨리 맞춰집니다.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => void saveMonth({ deposit: plan.deposit, rows: plan.rows, budget: plan.budget })}
        disabled={isSaving || saveBlockedReason != null}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-60"
      >
        {isSaving ? <RefreshCcw size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
        {isSaving ? '저장 중…' : hasMonthRow ? '추가 매수 기록' : '이번 달 기록하기'}
      </button>
      {saveBlockedReason && (
        <p role="status" className="mt-2 break-keep text-center text-xs font-semibold text-amber-700 dark:text-amber-400">
          {saveBlockedReason}
        </p>
      )}
      <p className="mt-2 text-center text-[11px] text-slate-400">
        환율 1USD = {formatNum(myAccount.currentExchangeRate)}원
      </p>
    </Card>
  );
}
