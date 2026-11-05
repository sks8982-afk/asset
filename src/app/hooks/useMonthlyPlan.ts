'use client';

import { useCallback, useMemo, useState } from 'react';
import type { MyAccountData } from '@/lib/types';
import type { AppSettings } from '@/lib/settings';
import { CORE_GROUP_KEYS, getBuyVehicle, type CoreGroup } from '@/lib/assets';
import { coreDrift, planCoreBuys } from '@/lib/core';
import {
  applyPlanEdits, cleanPrice, cleanQty, groupToBoost, planTotals, waitingCashOf, type PlanEdit,
} from '@/lib/monthly';

type MonthlyPlanInput = {
  myAccount: MyAccountData;
  settings: Pick<AppSettings, 'monthlyBudget' | 'coreWeights' | 'emergencyFundAmount'>;
  /** 이번 달 입금 기록이 이미 있는지 — 있으면 입금액 기본값을 0으로 (같은 달 입금 이중 기록 방지) */
  hasMonthRow: boolean;
};

/** 어느 입금액에 대한 수정인지 함께 기억 — 입금액이 바뀌면 수정은 버린다 */
type EditState = { deposit: number; lines: Record<string, PlanEdit> };

const NO_EDITS: EditState = { deposit: -1, lines: {} };

/**
 * 이번 달 적립 계산 상태.
 * - 입금액: 기본은 설정의 월 적립 금액(이번 달 입금 기록이 이미 있으면 0), 고치면 이번 달에만 적용
 * - 매수 금액 = 입금 + 투자 대기 현금 → 70:30 정수 주 (planCoreBuys)
 * - 수량·체결가는 줄마다 고칠 수 있고, 입금액이 바뀌면 처음 계산으로 돌아간다
 */
export function useMonthlyPlan({ myAccount, settings, hasMonthRow }: MonthlyPlanInput) {
  const [depositOverride, setDepositOverride] = useState<number | null>(null);
  const [edits, setEdits] = useState<EditState>(NO_EDITS);
  const deposit = depositOverride ?? (hasMonthRow ? 0 : settings.monthlyBudget);
  const activeEdits = edits.deposit === deposit ? edits.lines : NO_EDITS.lines;

  const cash = useMemo(
    () => waitingCashOf({
      ledgerCash: myAccount.currentCashBalance,
      accruedInterest: myAccount.cumulativeCmaInterestToToday,
      emergencyFund: settings.emergencyFundAmount,
    }),
    [myAccount.currentCashBalance, myAccount.cumulativeCmaInterestToToday, settings.emergencyFundAmount],
  );
  const budget = deposit + cash.waiting;

  const plan = useMemo(() => {
    const prices = myAccount.currentPriceMap;
    const vehicles = Object.fromEntries(
      CORE_GROUP_KEYS.map((g) => {
        const { key } = getBuyVehicle(g);
        return [g, { key, price: prices[key] ?? 0 }];
      }),
    ) as Record<CoreGroup, { key: string; price: number }>;
    return planCoreBuys({ amount: budget, weights: settings.coreWeights, vehicles });
  }, [budget, settings.coreWeights, myAccount.currentPriceMap]);

  const rows = useMemo(() => applyPlanEdits(plan, activeEdits), [plan, activeEdits]);
  const totals = planTotals(rows, budget);

  const drift = useMemo(() => {
    const values = Object.fromEntries(Object.entries(myAccount.portfolio).map(([k, p]) => [k, p.val]));
    return coreDrift(values, settings.coreWeights);
  }, [myAccount.portfolio, settings.coreWeights]);
  const hasCoreHoldings = CORE_GROUP_KEYS.some((g) => drift[g].value > 0);

  const editLine = useCallback((key: string, patch: PlanEdit) => {
    setEdits((prev) => {
      const lines = prev.deposit === deposit ? prev.lines : {};
      return { deposit, lines: { ...lines, [key]: { ...lines[key], ...patch } } };
    });
  }, [deposit]);

  const setQty = useCallback((key: string, qty: number) => editLine(key, { qty: cleanQty(qty) }), [editLine]);
  const setPrice = useCallback((key: string, price: number) => editLine(key, { price: cleanPrice(price) }), [editLine]);

  /** 저장 후 — 입금액은 기본값으로, 수정은 버린다 */
  const reset = useCallback(() => {
    setDepositOverride(null);
    setEdits(NO_EDITS);
  }, []);

  return {
    deposit,
    setDeposit: setDepositOverride,
    cash,
    budget,
    rows,
    totals,
    drift,
    hasCoreHoldings,
    groupToBoost: hasCoreHoldings ? groupToBoost(drift) : null,
    setQty,
    setPrice,
    reset,
  };
}
