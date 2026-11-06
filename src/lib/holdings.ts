/**
 * 보유 종목 계산 — 코어 묶음(S&P500·나스닥100)별 평가액·원금·비중, 보유만 종목 목록, 종목별 평단 대비 손익.
 */
import { ASSETS, CORE_GROUP_KEYS, CORE_GROUPS, HOLD_ASSETS, getAsset, getGroupKeys, type CoreGroup } from './assets';
import { coreDrift } from './core';
import { groupToBoost } from './monthly';
import type { AssetPortfolio } from './types';

type Holding = Pick<AssetPortfolio, 'qty' | 'cost' | 'avg' | 'val'>;
type PortfolioMap = Readonly<Record<string, Holding>>;
type PriceMap = Readonly<Record<string, number>>;

/** 보유 중인 종목 한 줄 */
export type HeldPosition = {
  key: string;
  name: string;
  qty: number;
  /** 평단 (이동평균) */
  avg: number;
  /** 현재가 (없으면 0) */
  price: number;
  /** 평가액 */
  value: number;
  /** 원금 (남은 이동평균 원가) */
  cost: number;
};

export type CoreGroupAllocation = {
  group: CoreGroup;
  label: string;
  value: number;
  cost: number;
  /** 수익률 % (원금이 없으면 null) */
  roiPct: number | null;
  /** 코어 안 현재 비중 % */
  weightPct: number;
  /** 목표 비중 % */
  targetPct: number;
  /** 현재 − 목표 (%p) */
  deviationPp: number;
  /** 보유 수량이 있는 종목 (자산 정의 순서) */
  positions: HeldPosition[];
  /** 보유 종목 중 시세가 없는 것이 있음 — 평가액이 0으로 잡혀 수익률·비중이 실제와 다르다 */
  missingPrice: boolean;
};

export type CoreAllocation = {
  groups: CoreGroupAllocation[];
  /** 코어 평가액 합계 */
  total: number;
  /** 목표에서 5%p 넘게 벗어났을 때 더 사야 할(비중이 낮은) 묶음 (시세가 빠진 묶음이 있으면 판단하지 않는다) */
  boost: CoreGroup | null;
};

function heldPosition(key: string, holding: Holding | undefined, prices: PriceMap): HeldPosition | null {
  if (!holding || !(holding.qty > 0)) return null;
  const price = Number(prices[key]) || 0;
  return {
    key,
    name: getAsset(key)?.name ?? key,
    qty: holding.qty,
    avg: holding.avg,
    price: price > 0 ? price : 0,
    value: holding.val,
    cost: holding.cost,
  };
}

function roiPctOf(value: number, cost: number): number | null {
  return cost > 0 ? (value / cost - 1) * 100 : null;
}

/** 코어 묶음별 평가액·원금·수익률·비중 (나스닥100 = TIGER 133690 + KODEX 379810) */
export function coreAllocation(
  portfolio: PortfolioMap,
  prices: PriceMap,
  weights: Readonly<Record<CoreGroup, number>>,
): CoreAllocation {
  const values = Object.fromEntries(Object.entries(portfolio).map(([k, p]) => [k, p.val]));
  const drift = coreDrift(values, weights);
  const groups = CORE_GROUP_KEYS.map((group): CoreGroupAllocation => {
    const positions = getGroupKeys(group)
      .map((key) => heldPosition(key, portfolio[key], prices))
      .filter((p): p is HeldPosition => p !== null);
    const cost = positions.reduce((s, p) => s + p.cost, 0);
    const missingPrice = positions.some((p) => p.price <= 0);
    const { value, weight, target, deviationPp } = drift[group];
    return {
      group,
      label: CORE_GROUPS[group].label,
      value,
      cost,
      roiPct: missingPrice ? null : roiPctOf(value, cost),
      weightPct: weight * 100,
      targetPct: target * 100,
      deviationPp,
      positions,
      missingPrice,
    };
  });
  return {
    groups,
    total: groups.reduce((s, g) => s + g.value, 0),
    boost: groups.some((g) => g.missingPrice) ? null : groupToBoost(drift),
  };
}

export type HoldOnlyHolding = HeldPosition & {
  /** 수익률 % (원금이나 시세가 없으면 null) */
  roiPct: number | null;
  /** 총자산 중 비중 % */
  sharePct: number;
};

/** 보유만 하는 종목 중 수량이 있는 것 — 평가액 큰 순 */
export function holdOnlyHoldings(portfolio: PortfolioMap, prices: PriceMap, totalAsset: number): HoldOnlyHolding[] {
  return HOLD_ASSETS
    .map((asset) => heldPosition(asset.key, portfolio[asset.key], prices))
    .filter((p): p is HeldPosition => p !== null)
    .map((p) => ({
      ...p,
      roiPct: p.price > 0 ? roiPctOf(p.value, p.cost) : null,
      sharePct: totalAsset > 0 ? (p.value / totalAsset) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export type HoldingPnl = HeldPosition & {
  /** 평가 손익 = 평가액 − 원금 (시세가 없으면 null) */
  pnl: number | null;
  /** 평단 대비 수익률 % (원금이나 시세가 없으면 null) */
  roiPct: number | null;
};

/** 보유 중인 모든 종목(코어·보유만)의 평단 대비 손익 — 평가액 큰 순 */
export function holdingsPnl(portfolio: PortfolioMap, prices: PriceMap): HoldingPnl[] {
  return ASSETS
    .map((asset) => heldPosition(asset.key, portfolio[asset.key], prices))
    .filter((p): p is HeldPosition => p !== null)
    .map((p) => {
      // 시세가 없으면 평가액이 0이라 손익이 −100%로 보이므로 비워 둔다
      const priced = p.price > 0;
      return { ...p, pnl: priced ? p.value - p.cost : null, roiPct: priced ? roiPctOf(p.value, p.cost) : null };
    })
    .sort((a, b) => b.value - a.value);
}
