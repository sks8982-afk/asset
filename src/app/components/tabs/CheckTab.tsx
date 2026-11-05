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
};

/** 점검 — 코어 비중 → 보유만 종목 → 자산 추이 → S&P500만 샀다면 */
export function CheckTab({ myAccount, dbHistory, fullMarketHistory, livePrices, coreWeights, darkMode }: CheckTabProps) {
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
      dbHistory.records,
      chartHistory.map((p) => ({
        date: String(p.date),
        principal: Number(p.principal ?? 0),
        investment: Number(p.investment ?? 0),
      })),
      fullMarketHistory,
      livePrices,
    );
  }, [chartHistory, fullMarketHistory, livePrices, dbHistory.records]);

  const hasHoldOnly = holdOnly.length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div className={`min-w-0 ${hasHoldOnly ? '' : 'lg:col-span-2'}`}>
        <CoreAllocationCard allocation={allocation} />
      </div>
      {hasHoldOnly && (
        <div className="min-w-0">
          <HoldOnlyCard holdings={holdOnly} />
        </div>
      )}
      <div className="min-w-0 lg:col-span-2">
        <AssetGrowthSection chartHistory={chartHistory} darkMode={darkMode} />
      </div>
      <div className="min-w-0 lg:col-span-2">
        <BenchmarkComparisonSection
          points={benchmark.points}
          results={benchmark.results}
          formatNum={formatNum}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}
