'use client';

import { useMemo } from 'react';
import type { BuyGuideItem, BuyPlanResult, MyAccountData } from '@/lib/types';

type BuyPlanInput = {
  myAccount: Pick<MyAccountData, 'currentPriceMap' | 'prevPriceMap'> | null;
  /** 이번 달 입금액 */
  inputBudget: number;
  /** 자산별 목표 비율 (합이 1이 아니어도 비율로 사용) */
  ratios: Record<string, number>;
  /** 직접 수정한 수량 */
  manualEdits: Record<string, number>;
};

const finiteNonNegative = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 0);

/**
 * 이번 달 매수 가이드 — 입금액을 목표 비율대로 나눠 정수 주(BTC는 소수) 매수.
 * 직접 수정한 수량이 있으면 그 수량을 쓴다.
 */
export function buildBuyPlan({ myAccount, inputBudget, ratios, manualEdits }: BuyPlanInput): BuyPlanResult | null {
  if (!myAccount) return null;
  const { currentPriceMap, prevPriceMap } = myAccount;
  const ratioSum = Object.values(ratios).reduce((a, b) => a + b, 0);
  const assetKeys = Object.keys(ratios).filter((k) => k !== 'cash');

  const guide: Record<string, BuyGuideItem> = {};
  let totalExpectedSpend = 0;
  for (const k of assetKeys) {
    const price = currentPriceMap[k] || 0;
    const drop = (price / (prevPriceMap[k] || 1) - 1) * 100;
    const alloc = ratioSum > 0 ? inputBudget * (ratios[k] / ratioSum) : 0;
    const rawQty = price > 0 ? (k === 'btc' ? alloc / price : Math.floor(alloc / price)) : 0;
    const baseQty = finiteNonNegative(rawQty);
    const qty = finiteNonNegative(manualEdits[k] ?? baseQty);
    const spent = qty * price;
    totalExpectedSpend += spent;
    guide[k] = { qty, baseQty, price, spent, drop: Number.isFinite(drop) ? drop : 0 };
  }

  return { guide, thisMonthResidue: inputBudget - totalExpectedSpend, totalExpectedSpend };
}

export function useBuyPlan({ myAccount, inputBudget, ratios, manualEdits }: BuyPlanInput): BuyPlanResult | null {
  return useMemo(
    () => buildBuyPlan({ myAccount, inputBudget, ratios, manualEdits }),
    [myAccount, inputBudget, ratios, manualEdits],
  );
}
