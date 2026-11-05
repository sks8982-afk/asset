'use client';

import React, { useMemo } from 'react';
import type { DbHistory, LivePrices, MarketDataPoint, MyAccountData } from '@/lib/types';
import type { CoreGroup } from '@/lib/assets';
import { calculateBenchmarkComparison } from '@/lib/benchmark';
import { coreAllocation, holdOnlyHoldings } from '@/lib/holdings';
import { formatNum } from '@/lib/utils';
import { CoreAllocationCard } from '../check/CoreAllocationCard';
import { HoldOnlyCard } from '../check/HoldOnlyCard';
import { AssetGrowthSection } from '../AssetGrowthSection';
import { BenchmarkComparisonSection } from '../BenchmarkComparisonSection';

type CheckTabProps = {
  myAccount: MyAccountData;
  dbHistory: DbHistory;
  fullMarketHistory: MarketDataPoint[];
  livePrices: LivePrices | null;
  coreWeights: Record<CoreGroup, number>;
  darkMode: boolean;
  /** 수익률 숨기기 — 평가액·수익률·차트를 가린다 (원금·비중은 보인다) */
  hideReturns: boolean;
};

/** 점검 — 코어 비중 → 보유만 종목 → 자산 추이 → S&P500만 샀다면 */
export function CheckTab({
  myAccount, dbHistory, fullMarketHistory, livePrices, coreWeights, darkMode, hideReturns,
}: CheckTabProps) {
  const { portfolio, currentPriceMap, totalAsset, chartHistory } = myAccount;

  const allocation = useMemo(
    () => coreAllocation(portfolio, currentPriceMap, coreWeights),
    [portfolio, currentPriceMap, coreWeights],
  );
  const holdOnly = useMemo(
    () => holdOnlyHoldings(portfolio, currentPriceMap, totalAsset),
    [portfolio, currentPriceMap, totalAsset],
  );

  const benchmark = useMemo(() => {
    if (!fullMarketHistory.length || !livePrices) return { points: [], results: [] };
    return calculateBenchmarkComparison(
      dbHistory.budgets,
      chartHistory.map((p) => ({ date: String(p.date), investment: Number(p.investment ?? 0) })),
      fullMarketHistory,
      livePrices,
    );
  }, [chartHistory, fullMarketHistory, livePrices, dbHistory.budgets]);

  const hasHoldOnly = holdOnly.length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div className={`min-w-0 ${hasHoldOnly ? '' : 'lg:col-span-2'}`}>
        <CoreAllocationCard allocation={allocation} hideReturns={hideReturns} />
      </div>
      {hasHoldOnly && (
        <div className="min-w-0">
          <HoldOnlyCard holdings={holdOnly} hideReturns={hideReturns} />
        </div>
      )}
      <div className="min-w-0 lg:col-span-2">
        <AssetGrowthSection chartHistory={chartHistory} darkMode={darkMode} hideReturns={hideReturns} />
      </div>
      <div className="min-w-0 lg:col-span-2">
        <BenchmarkComparisonSection
          points={benchmark.points}
          results={benchmark.results}
          formatNum={formatNum}
          darkMode={darkMode}
          hideReturns={hideReturns}
        />
      </div>
    </div>
  );
}
