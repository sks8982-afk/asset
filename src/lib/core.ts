/**
 * 코어 적립 계산 — S&P500 / 나스닥100 고정 비중 매수, 비중 점검, 고점 대비 낙폭.
 */
import { CORE_GROUP_KEYS, getGroupKeys, type CoreGroup } from './assets';

export type CoreBuyLine = {
  group: CoreGroup;
  key: string;
  qty: number;
  price: number;
  cost: number;
};

export type CoreBuyPlan = {
  /** 코어 묶음마다 한 줄 (CORE_GROUP_KEYS 순서, 수량 0 포함) */
  lines: CoreBuyLine[];
  spent: number;
  /** 다음 달로 넘길 잔돈 */
  leftover: number;
};

export type CoreDriftEntry = {
  /** 묶음 평가액 */
  value: number;
  /** 현재 비중 (0~1, 코어 합계 기준) */
  weight: number;
  /** 목표 비중 (0~1) */
  target: number;
  /** 현재 − 목표 (%p) */
  deviationPp: number;
};

/** 부동소수 오차 허용치 (원) */
const EPSILON = 1e-6;

function positiveOrZero(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** 목표 비중 정규화 (음수·NaN은 0, 합이 0이면 모두 0) */
function normalizeWeights(weights: Record<CoreGroup, number>): Record<CoreGroup, number> {
  const clean = CORE_GROUP_KEYS.map((g) => positiveOrZero(weights[g]));
  const sum = clean.reduce((s, w) => s + w, 0);
  return Object.fromEntries(
    CORE_GROUP_KEYS.map((g, i) => [g, sum > 0 ? clean[i] / sum : 0]),
  ) as Record<CoreGroup, number>;
}

/**
 * 이번 달 코어 매수 수량 — 고정 비중 분할, 정수 주.
 * 1. 목표액 = 금액 × 비중, 수량 = floor(목표액 / 가격)
 * 2. 남은 돈으로 살 수 있고 아직 목표에 못 미친 묶음 중 부족액이 가장 큰 곳에 1주씩 추가
 *    (목표를 넘긴 묶음은 더 사지 않는다 — 비싼 쪽을 못 사는 달마다 싼 쪽만 쌓여 비중이 쏠리는 것 방지)
 * 가격이 없는(0 이하) 묶음의 몫은 다른 묶음에 쓰지 않고 잔돈으로 남긴다.
 */
export function planCoreBuys({ amount, weights, vehicles }: {
  amount: number;
  weights: Record<CoreGroup, number>;
  vehicles: Record<CoreGroup, { key: string; price: number }>;
}): CoreBuyPlan {
  const budget = positiveOrZero(amount);
  const w = normalizeWeights(weights);
  const groups = CORE_GROUP_KEYS.map((group) => {
    const price = positiveOrZero(vehicles[group].price);
    const target = budget * w[group];
    return { group, key: vehicles[group].key, price, target, buyable: price > 0 && w[group] > 0 };
  });
  const qty = groups.map((g) => (g.buyable ? Math.floor(g.target / g.price) : 0));

  // 추가 매수에 쓸 수 있는 돈 = 가격 있는 묶음의 반올림 잔액 (가격 없는 묶음 몫은 제외)
  const reserved = groups.reduce((s, g) => s + (g.price > 0 ? 0 : g.target), 0);
  let pool = budget - reserved - groups.reduce((s, g, i) => s + qty[i] * g.price, 0);

  for (;;) {
    const candidates = groups
      .map((g, i) => ({ i, shortfall: g.target - qty[i] * g.price }))
      .filter(({ i, shortfall }) =>
        groups[i].buyable && shortfall > EPSILON && groups[i].price <= pool + EPSILON);
    if (candidates.length === 0) break;
    const best = candidates.reduce((a, b) => (b.shortfall > a.shortfall ? b : a));
    qty[best.i] += 1;
    pool -= groups[best.i].price;
  }

  const lines = groups.map((g, i) => ({
    group: g.group, key: g.key, qty: qty[i], price: g.price, cost: qty[i] * g.price,
  }));
  const spent = lines.reduce((s, l) => s + l.cost, 0);
  return { lines, spent, leftover: budget - spent };
}

/**
 * 코어 비중 점검 — 묶음별 평가액·현재 비중·목표 비중·차이(%p).
 * 같은 묶음의 종목은 합산한다 (나스닥100 = TIGER 133690 + KODEX 379810).
 * 코어 평가액이 0이면 비중·차이는 0.
 */
export function coreDrift(
  values: Record<string, number>,
  weights: Record<CoreGroup, number>,
): Record<CoreGroup, CoreDriftEntry> {
  const target = normalizeWeights(weights);
  const groupValues = CORE_GROUP_KEYS.map((g) =>
    getGroupKeys(g).reduce((s, key) => s + positiveOrZero(values[key]), 0),
  );
  const total = groupValues.reduce((s, v) => s + v, 0);
  return Object.fromEntries(
    CORE_GROUP_KEYS.map((g, i) => {
      const weight = total > 0 ? groupValues[i] / total : 0;
      const deviationPp = total > 0 ? (weight - target[g]) * 100 : 0;
      return [g, { value: groupValues[i], weight, target: target[g], deviationPp }];
    }),
  ) as Record<CoreGroup, CoreDriftEntry>;
}

/**
 * 고점 대비 낙폭 (%, 양수 = 고점보다 낮음).
 * 고점 = 최근 months개 월 종가(유효값)와 현재가 중 최댓값. 현재가가 없으면 0.
 */
export function drawdownFromHigh(monthlyCloses: number[], live: number, months = 12): number {
  if (!(Number.isFinite(live) && live > 0)) return 0;
  const valid = monthlyCloses.filter((p) => Number.isFinite(p) && p > 0);
  const n = Math.floor(months);
  const window = n > 0 ? valid.slice(-n) : [];
  const high = Math.max(live, ...window);
  return ((high - live) / high) * 100;
}
