'use client';

import React, { useMemo, useState } from 'react';
import type { DbHistory, LivePrices, MarketDataPoint, MyAccountData } from '@/lib/types';
import { CORE_ASSETS, CORE_GROUP_KEYS, CORE_GROUPS, HOLD_ASSETS, type CoreGroup } from '@/lib/assets';
import { COLORS, FOREIGN_ASSET_KEYS, NAMES, STORAGE_KEYS } from '@/lib/constants';
import { coreDrift } from '@/lib/core';
import { calculateBenchmarkComparison, formatDec, formatNum } from '@/lib/utils';
import { todayISO } from '@/lib/date';
import { toast } from '../../hooks/useToast';
import { useRebalancingHistory } from '../../hooks/useRebalancingHistory';
import { useQuarterlyRebalancingBanner } from '../../hooks/useQuarterlyBanner';
import { HoldingsSummarySection } from '../HoldingsSummarySection';
import { WeightChartSection } from '../WeightChartSection';
import { RebalancingGuideModal } from '../RebalancingGuideModal';
import { AssetGrowthSection } from '../AssetGrowthSection';
import { HoldingsDetailSection } from '../HoldingsDetailSection';
import { BenchmarkComparisonSection } from '../BenchmarkComparisonSection';
import { RealReturnSection } from '../RealReturnSection';
import { ExchangeRateSection } from '../ExchangeRateSection';

/** 보유 현황 묶음 — 매달 사는 코어 / 보유만 */
const HOLDING_GROUPS = [
  { label: '코어 (매달 적립)', keys: CORE_ASSETS.map((a) => a.key) },
  { label: '보유만 (매수 계산 제외)', keys: HOLD_ASSETS.map((a) => a.key) },
];

const round1 = (v: number): number => Math.round(v * 10) / 10;

type CheckTabProps = {
  myAccount: MyAccountData;
  dbHistory: DbHistory;
  fullMarketHistory: MarketDataPoint[];
  livePrices: LivePrices | null;
  coreWeights: Record<CoreGroup, number>;
  darkMode: boolean;
};

/**
 * 점검 (임시 구성 — 기존 섹션을 그대로 옮김).
 * 비중 차트·리밸런싱 가이드는 예전 자산별 목표 비율 대신 코어 묶음(S&P500·나스닥100)의 목표 비중으로 계산한다.
 */
export function CheckTab({ myAccount, dbHistory, fullMarketHistory, livePrices, coreWeights, darkMode }: CheckTabProps) {
  const [rebalancingHistory, setRebalancingHistory] = useRebalancingHistory();
  const [showQuarterBanner, setShowQuarterBanner] = useQuarterlyRebalancingBanner();
  const [showRebalancingModal, setShowRebalancingModal] = useState(false);
  const [chartLegendHidden, setChartLegendHidden] = useState({ investment: false, principal: false });
  const [assetChartView, setAssetChartView] = useState<'total' | 'byAsset'>('total');
  const [hiddenAssetSeries, setHiddenAssetSeries] = useState<Record<string, boolean>>({});
  const { portfolio, totalAsset, totalInvested, chartHistory, currentExchangeRate, currentPriceMap } = myAccount;

  /** 코어 묶음별 목표 vs 현재 (코어 평가액 합계 기준) */
  const coreItems = useMemo(() => {
    const values = Object.fromEntries(Object.entries(portfolio).map(([k, p]) => [k, p.val]));
    const drift = coreDrift(values, coreWeights);
    const coreTotal = CORE_GROUP_KEYS.reduce((s, g) => s + drift[g].value, 0);
    return CORE_GROUP_KEYS.map((g) => {
      const targetAmount = coreTotal * drift[g].target;
      return {
        key: g,
        name: CORE_GROUPS[g].label,
        targetWeight: round1(drift[g].target * 100),
        currentWeight: round1(drift[g].weight * 100),
        targetAmount,
        currentAmount: drift[g].value,
        diff: targetAmount - drift[g].value,
      };
    });
  }, [portfolio, coreWeights]);

  const weightChartData = coreItems.map((i) => ({
    name: i.name, key: i.key, 목표비중: i.targetWeight, 현재비중: i.currentWeight,
  }));

  const benchmarkData = useMemo(() => {
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

  const openRebalancingFromBanner = () => {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    localStorage.setItem(STORAGE_KEYS.rebalancingAlertQuarter, `${now.getFullYear()}-Q${quarter}`);
    setShowQuarterBanner(false);
    setShowRebalancingModal(true);
  };

  const saveRebalancingSnapshot = () => {
    const snapshot = { date: todayISO(), totalAsset, items: coreItems };
    setRebalancingHistory([snapshot, ...rebalancingHistory].slice(0, 20));
    toast.success('리밸런싱 스냅샷이 저장되었습니다.');
  };

  return (
    <div className="space-y-6">
      <HoldingsSummarySection
        portfolio={portfolio}
        names={NAMES}
        colors={COLORS}
        assetGroups={HOLDING_GROUPS}
        formatNum={formatNum}
        formatDec={formatDec}
        currentPriceMap={currentPriceMap}
      />

      {showQuarterBanner && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-amber-200 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
            이번 분기 리밸런싱을 고려해 보세요.
          </p>
          <button
            type="button"
            onClick={openRebalancingFromBanner}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700"
          >
            리밸런싱 가이드 보기
          </button>
        </div>
      )}
      <WeightChartSection
        weightChartData={weightChartData}
        darkMode={darkMode}
        onOpenRebalancing={() => setShowRebalancingModal(true)}
      />
      <RebalancingGuideModal
        open={showRebalancingModal}
        onClose={() => setShowRebalancingModal(false)}
        totalAsset={totalAsset}
        items={coreItems}
        formatNum={formatNum}
        history={rebalancingHistory}
        onSaveSnapshot={saveRebalancingSnapshot}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AssetGrowthSection
            chartHistory={chartHistory}
            darkMode={darkMode}
            formatNum={formatNum}
            assetChartView={assetChartView}
            setAssetChartView={setAssetChartView}
            chartLegendHidden={chartLegendHidden}
            setChartLegendHidden={setChartLegendHidden}
            hiddenAssetSeries={hiddenAssetSeries}
            setHiddenAssetSeries={setHiddenAssetSeries}
            names={NAMES}
            colors={COLORS}
          />
        </div>
        <HoldingsDetailSection
          portfolio={portfolio}
          names={NAMES}
          colors={COLORS}
          formatNum={formatNum}
          formatDec={formatDec}
          currentPriceMap={currentPriceMap}
        />
      </div>

      <BenchmarkComparisonSection
        points={benchmarkData.points}
        results={benchmarkData.results}
        formatNum={formatNum}
        darkMode={darkMode}
      />

      <RealReturnSection
        totalAsset={totalAsset}
        totalInvested={totalInvested}
        totalDividends={myAccount.totalDividends ?? 0}
        cumulativeCmaInterest={myAccount.cumulativeCmaInterestToToday ?? 0}
        oldestDepositDate={dbHistory.budgets[0]?.month_date ?? todayISO()}
        budgets={dbHistory.budgets}
        formatNum={formatNum}
      />

      <ExchangeRateSection
        currentExchangeRate={currentExchangeRate}
        foreignAssets={FOREIGN_ASSET_KEYS
          .filter((k) => k !== 'btc' && portfolio[k]?.qty > 0)
          .map((k) => ({
            key: k,
            name: NAMES[k] ?? k,
            qty: portfolio[k]?.qty ?? 0,
            costKrw: portfolio[k]?.cost ?? 0,
            valueKrw: portfolio[k]?.val ?? 0,
          }))}
        formatNum={formatNum}
      />
    </div>
  );
}
