'use client';

import { useMemo } from 'react';
import type {
  AssetPortfolio, ChartDataPoint, DbHistory, LivePrices, MarketDataPoint, MyAccountData,
} from '@/lib/types';
import { NAMES } from '@/lib/constants';
import {
  calculatePositions, calculateRealizedPnl, filterBuyRecords, filterSellRecords,
  getCumulativeInterestByMonths, getInterestFromMonthStartToToday, getRecordAmount,
  type Position,
} from '@/lib/utils';
import { currentYearMonth } from '@/lib/date';

export type MyAccountInput = {
  /** 월별 시세 (오래된 달 → 최근 달) */
  marketData: MarketDataPoint[];
  livePrices: LivePrices | null;
  dbHistory: Pick<DbHistory, 'budgets' | 'records' | 'dividends'>;
  /** CMA 연 이율 % */
  cmaRate: number;
  now?: Date;
};

const NO_POSITION: Position = { qty: 0, cost: 0, avgCost: 0 };

const ASSET_KEYS = Object.keys(NAMES).filter((k) => k !== 'cash');

function sumBy<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((acc, item) => acc + value(item), 0);
}

function toPriceMap(source: Readonly<Record<string, unknown>>): Record<string, number> {
  return Object.fromEntries(Object.entries(source).map(([k, v]) => [k, Number(v) || 0]));
}

/** 현금 = 입금 − 매수 + 매도 대금 + 배당 */
function cashOf(
  budgets: MyAccountInput['dbHistory']['budgets'],
  records: MyAccountInput['dbHistory']['records'],
  dividends: MyAccountInput['dbHistory']['dividends'],
): number {
  return (
    sumBy(budgets, (b) => Number(b.amount ?? 0)) -
    sumBy(filterBuyRecords(records), getRecordAmount) +
    sumBy(filterSellRecords(records), getRecordAmount) +
    sumBy(dividends, (d) => Number(d.amount ?? 0))
  );
}

/** 자산별 보유 현황 — 수량·원가·평단은 이동평균법, 수익률 = 평가액 / 남은 원가 − 1 */
function buildPortfolio(
  positions: Record<string, Position>,
  prices: Record<string, number>,
  realizedPnl: Record<string, number>,
  cashBalance: number,
): { portfolio: Record<string, AssetPortfolio>; totalStockValue: number } {
  const entries = ASSET_KEYS.map((k): [string, AssetPortfolio] => {
    const p = positions[k] ?? NO_POSITION;
    const val = p.qty * (prices[k] ?? 0);
    return [k, {
      qty: p.qty,
      cost: p.cost,
      avg: p.avgCost,
      val,
      roi: p.cost > 0 ? (val / p.cost - 1) * 100 : 0,
      weight: 0,
      realizedPnl: realizedPnl[k] ?? 0,
    }];
  });
  const totalStockValue = sumBy(entries, ([, p]) => p.val);
  const total = totalStockValue + cashBalance;
  const weightOf = (value: number): number => (total > 0 ? (value / total) * 100 : 0);
  const cash: AssetPortfolio = {
    qty: 0, cost: 0, avg: 0, val: 0, roi: 0, weight: weightOf(cashBalance), realizedPnl: realizedPnl.cash ?? 0,
  };
  return {
    portfolio: {
      ...Object.fromEntries(entries.map(([k, p]) => [k, { ...p, weight: weightOf(p.val) }])),
      cash,
    },
    totalStockValue,
  };
}

/** 월별 차트 포인트 — 그달까지의 입금·매수·매도·배당으로 현금과 보유분을 되짚는다 */
function buildChartPoint(
  monthPoint: MarketDataPoint,
  { budgets, records, dividends }: MyAccountInput['dbHistory'],
  cmaInterest: number,
): ChartDataPoint {
  const month = monthPoint.d;
  const upToMonth = (date: string | undefined): boolean => (date || '').substring(0, 7) <= month;
  const budgetsUntil = budgets.filter((b) => upToMonth(b.month_date));
  const recordsUntil = records.filter((r) => upToMonth(r.date));
  const cash = cashOf(budgetsUntil, recordsUntil, dividends.filter((d) => upToMonth(d.date)));
  const positions = calculatePositions(recordsUntil);

  const point: ChartDataPoint = {
    date: month,
    principal: sumBy(budgetsUntil, (b) => Number(b.amount ?? 0)),
    investment: 0,
    cash,
    cmaInterest,
  };
  let stockValue = 0;
  for (const k of ASSET_KEYS) {
    const p = positions[k] ?? NO_POSITION;
    const value = p.qty * (Number(monthPoint[k]) || 0);
    point[`principal_${k}`] = p.cost;
    point[`value_${k}`] = value;
    stockValue += value;
  }
  return { ...point, investment: stockValue + cash + cmaInterest };
}

/** 내 계좌 현황 (DB 기록 + 시세). 시세가 없으면 null */
export function buildMyAccount({
  marketData, livePrices, dbHistory, cmaRate, now = new Date(),
}: MyAccountInput): MyAccountData | null {
  if (!marketData.length) return null;
  const { budgets, records, dividends } = dbHistory;
  const lastHistoryPoint = marketData[marketData.length - 1];
  const currentPriceMap = toPriceMap(livePrices || lastHistoryPoint);
  const prevPriceMap = toPriceMap(marketData[marketData.length - 2] || lastHistoryPoint);

  const totalDeposit = sumBy(budgets, (b) => Number(b.amount ?? 0));
  const totalDividends = sumBy(dividends, (d) => Number(d.amount ?? 0));
  const currentCashBalance = cashOf(budgets, records, dividends);

  const realizedPnlByAsset = calculateRealizedPnl(records);
  const totalRealizedPnl = sumBy(Object.values(realizedPnlByAsset), (v) => v);
  const { portfolio, totalStockValue } = buildPortfolio(
    calculatePositions(records), currentPriceMap, realizedPnlByAsset, currentCashBalance,
  );

  // 일별 CMA 이자 누적 (월별 시점)
  const rate = cmaRate || 0;
  const monthStrings = marketData.map((m) => m.d);
  const cumulativeInterest = getCumulativeInterestByMonths(monthStrings, budgets, records, rate, dividends);
  const chartHistoryRaw = marketData.map((m, idx) =>
    buildChartPoint(m, dbHistory, cumulativeInterest[idx] ?? 0),
  );

  // 오늘까지 누적 이자: 마지막 월봉이 이번 달이면 그 전 달까지 + 이번 달 1일~오늘
  const lastIdx = cumulativeInterest.length - 1;
  const completedInterest =
    monthStrings[lastIdx] === currentYearMonth(now)
      ? cumulativeInterest[lastIdx - 1] ?? 0
      : cumulativeInterest[lastIdx] ?? 0;
  const interestUpToToday =
    completedInterest + getInterestFromMonthStartToToday(budgets, records, rate, dividends, now);
  const totalAsset = totalStockValue + currentCashBalance + interestUpToToday;

  // 마지막 포인트는 실시간 시세 기준 총자산
  const chartHistory = livePrices
    ? [
        ...chartHistoryRaw.slice(0, -1),
        { ...chartHistoryRaw[chartHistoryRaw.length - 1], investment: totalAsset, cmaInterest: interestUpToToday },
      ]
    : chartHistoryRaw;

  return {
    currentCashBalance,
    portfolio,
    currentPriceMap,
    prevPriceMap,
    totalStockValue,
    totalAsset,
    totalInvested: totalDeposit,
    chartHistory,
    currentExchangeRate: currentPriceMap.ex || 1350,
    cumulativeCmaInterestToToday: interestUpToToday,
    totalRealizedPnl,
    totalDividends,
  };
}

export function useMyAccount({
  marketData, livePrices, dbHistory, cmaRate,
}: Omit<MyAccountInput, 'now'>): MyAccountData | null {
  return useMemo(
    () => buildMyAccount({ marketData, livePrices, dbHistory, cmaRate }),
    [marketData, livePrices, dbHistory, cmaRate],
  );
}
