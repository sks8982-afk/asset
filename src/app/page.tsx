'use client';
import React, { useState, useMemo, useCallback } from 'react';
import type { AssetPortfolio } from '@/lib/types';
import { useDarkMode } from './hooks/useDarkMode';
import { useLocalStorageNumber } from './hooks/useLocalStorageNumber';
import { useCustomRatios } from './hooks/useCustomRatios';
import { useRebalancingHistory } from './hooks/useRebalancingHistory';
import { useQuarterlyRebalancingBanner } from './hooks/useQuarterlyBanner';
import { useAppData } from './hooks/useAppData';
import { useHideReturns } from './hooks/useHideReturns';
import { useIpsRules } from './hooks/useIpsRules';
import { useMyAccount } from './hooks/useMyAccount';
import { useBuyPlan } from './hooks/useBuyPlan';
import { useGoalToast } from './hooks/useGoalToast';
import { useMonthlySave } from './hooks/useMonthlySave';
import { useDeleteByDate } from './hooks/useDeleteByDate';
import { useSellFlow } from './hooks/useSellFlow';
import { useLedgerMutations } from './hooks/useLedgerMutations';
import { useCsvExport } from './hooks/useCsvExport';
import { toast } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';
import {
  STORAGE_KEYS, COLORS, NAMES, DEFAULT_RATIOS,
  ASSET_MARKET_GROUPS, RATIO_PRESETS, FOREIGN_ASSET_KEYS,
} from '@/lib/constants';
import {
  formatNum, formatDec, calculateTaxSimulation,
  estimateGoalDate, calculateMDD, buildFlowAdjustedIndex, calculateBenchmarkComparison,
} from '@/lib/utils';
import { currentYearMonth, todayISO } from '@/lib/date';
import { HeaderSection } from './components/HeaderSection';
import { SectionNav } from './components/SectionNav';
import { HoldingsSummarySection } from './components/HoldingsSummarySection';
import { GoalSection } from './components/GoalSection';
import { MonthlyOverviewSection } from './components/MonthlyOverviewSection';
import { BuyGuideSection } from './components/BuyGuideSection';
import { WeightChartSection } from './components/WeightChartSection';
import { RebalancingGuideModal } from './components/RebalancingGuideModal';
import { AssetGrowthSection } from './components/AssetGrowthSection';
import { HoldingsDetailSection } from './components/HoldingsDetailSection';
import { InvestmentHistorySection } from './components/InvestmentHistorySection';
import { DepositsHistorySection } from './components/DepositsHistorySection';
import { DeleteByDateModal } from './components/DeleteByDateModal';
import { SettingsModal } from './components/SettingsModal';
import { GoalToastBar } from './components/GoalToastBar';
import { LoadingScreen } from './components/LoadingScreen';
import { SellRecordModal } from './components/SellRecordModal';
import { DividendSection } from './components/DividendSection';
import { TaxSimulationSection } from './components/TaxSimulationSection';
import { GoalProjectionSection } from './components/GoalProjectionSection';
import { ExchangeRateSection } from './components/ExchangeRateSection';
import { BenchmarkComparisonSection } from './components/BenchmarkComparisonSection';
import { InvestmentPolicySection } from './components/InvestmentPolicySection';
import { InvestmentStreakSection } from './components/InvestmentStreakSection';
import { WhatIfSection } from './components/WhatIfSection';
import { RealReturnSection } from './components/RealReturnSection';
import { EmotionJournalSection } from './components/EmotionJournalSection';
import { GoalScenariosSection } from './components/GoalScenariosSection';
import { DataIntegritySection } from './components/DataIntegritySection';
import { TradingFrequencyMonitor } from './components/TradingFrequencyMonitor';
import { IpsViolationModal } from './components/IpsViolationModal';

/** 계좌 데이터가 오기 전 매도 점검용 빈 포트폴리오 (매 렌더 새 객체를 만들지 않도록 고정) */
const EMPTY_PORTFOLIO: Record<string, AssetPortfolio> = {};

export default function RealDbTower() {
  const [inputBudget, setInputBudget] = useLocalStorageNumber(STORAGE_KEYS.budget, 1300000, 1);
  const [cmaRate, setCmaRate] = useLocalStorageNumber(STORAGE_KEYS.cmaRate, 1.95, 0);
  const [goalRoi, setGoalRoi] = useLocalStorageNumber(STORAGE_KEYS.goalRoi, 10, 0);
  const [goalAsset, setGoalAsset] = useLocalStorageNumber(STORAGE_KEYS.goalAsset, 100000000, 0);
  const [darkMode, setDarkMode] = useDarkMode();
  const [customRatios, setCustomRatios] = useCustomRatios();
  const [rebalancingHistory, setRebalancingHistory] = useRebalancingHistory();
  const [showRebalancingQuarterBanner, setShowRebalancingQuarterBanner] = useQuarterlyRebalancingBanner();
  const [hideReturns, setHideReturns] = useHideReturns();
  const [policyRules, setPolicyRules] = useIpsRules();

  const {
    loading,
    isRefreshing: isRefreshingPrice,
    marketData,
    fullMarketHistory,
    livePrices,
    marketMeta,
    dbHistory,
    setDbHistory,
    emergencyFundAmount,
    setEmergencyFundAmount,
    reload: loadAllData,
  } = useAppData();

  const [manualEdits, setManualEdits] = useState<Record<string, number>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [historyFilterMonth, setHistoryFilterMonth] = useState<string>('');
  const [historyFilterAsset, setHistoryFilterAsset] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showDeposits, setShowDeposits] = useState(false);
  const [chartLegendHidden, setChartLegendHidden] = useState<{
    investment: boolean;
    principal: boolean;
  }>({ investment: false, principal: false });
  const [assetChartView, setAssetChartView] = useState<'total' | 'byAsset'>(
    'total',
  );
  const [hiddenAssetSeries, setHiddenAssetSeries] = useState<
    Record<string, boolean>
  >({});
  const [showRebalancingModal, setShowRebalancingModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);

  const ratios = useMemo(
    (): Record<string, number> => ({ ...DEFAULT_RATIOS, ...(customRatios ?? {}) }),
    [customRatios],
  );
  const ratioSum = useMemo(
    () => Object.values(ratios).reduce((a, b) => a + b, 0),
    [ratios],
  );

  // 1. 내 자산 현황 (DB 기록 + 시세) → 2. 이번 달 매수 가이드 (비율 분할)
  const myAccount = useMyAccount({ marketData, livePrices, dbHistory, cmaRate });
  const buyPlan = useBuyPlan({ myAccount, inputBudget, ratios, manualEdits });

  const clearManualEdits = useCallback(() => setManualEdits({}), []);
  const { isSaving, saveMonthlyRecord } = useMonthlySave({
    buyPlan,
    dbHistory,
    inputBudget,
    reload: loadAllData,
    onSaved: clearManualEdits,
  });
  const deleteByDate = useDeleteByDate({ dbHistory, reload: loadAllData });
  const sellFlow = useSellFlow({
    records: dbHistory.records,
    portfolio: myAccount?.portfolio ?? EMPTY_PORTFOLIO,
    reload: loadAllData,
  });
  const ledger = useLedgerMutations({ reload: loadAllData, setDbHistory, setEmergencyFundAmount });
  const handleExportCSV = useCsvExport(dbHistory, myAccount);

  const totalRoi =
    myAccount && myAccount.totalInvested > 0
      ? (myAccount.totalAsset / myAccount.totalInvested - 1) * 100
      : 0;
  const { goalToast, closeGoalToast } = useGoalToast({
    ready: myAccount != null,
    roi: totalRoi,
    totalAsset: myAccount?.totalAsset ?? 0,
    goalRoi,
    goalAsset,
  });

  const weightChartData = useMemo(() => {
    if (!myAccount) return [];
    const { portfolio } = myAccount;
    return ASSET_MARKET_GROUPS.flatMap((g) =>
      g.keys.map((k) => ({
        name: NAMES[k],
        key: k,
        목표비중: Math.round((ratios[k] / ratioSum) * 1000) / 10,
        현재비중: Math.round((portfolio[k]?.weight ?? 0) * 100) / 100,
      }))
    );
  }, [myAccount, ratios, ratioSum]);

  /** 리밸런싱 가이드: 자산별 목표 금액 vs 현재 금액, 차이(매수/매도 제안) */
  const rebalancingData = useMemo(() => {
    if (!myAccount) return null;
    const { portfolio, totalAsset, currentCashBalance } = myAccount;
    const items = ASSET_MARKET_GROUPS.flatMap((g) => g.keys).map((k) => {
      const targetWeightPct = (ratios[k] / ratioSum) * 100;
      const targetAmount = totalAsset * (targetWeightPct / 100);
      const currentAmount =
        k === 'cash' ? currentCashBalance : (portfolio[k]?.val ?? 0);
      const diff = targetAmount - currentAmount;
      return {
        key: k,
        name: NAMES[k],
        targetWeight: Math.round(targetWeightPct * 10) / 10,
        currentWeight: Math.round((portfolio[k]?.weight ?? 0) * 10) / 10,
        targetAmount,
        currentAmount,
        diff,
      };
    });
    return { totalAsset, items };
  }, [myAccount, ratios, ratioSum]);

  /** ISA 세금 — 가입 이후 누적 (연도 지정 없음) */
  const taxSimulation = useMemo(() => {
    return calculateTaxSimulation(dbHistory.records, dbHistory.dividends);
  }, [dbHistory.records, dbHistory.dividends]);

  /** MDD 계산 — 입금 흐름 조정 지수 기준 (신규 입금이 낙폭을 가리지 않도록) */
  const mddValue = useMemo(() => {
    if (!myAccount || !myAccount.chartHistory.length) return 0;
    const index = buildFlowAdjustedIndex(
      myAccount.chartHistory.map((p) => ({
        principal: Number(p.principal) || 0,
        investment: Number(p.investment) || 0,
      })),
    );
    return calculateMDD(index).mdd;
  }, [myAccount]);

  // 벤치마크 대비 수익률 비교 (실제 입금 기록 기반)
  const benchmarkData = useMemo(() => {
    if (!myAccount || !fullMarketHistory.length || !livePrices) {
      return { points: [], results: [] };
    }
    return calculateBenchmarkComparison(
      dbHistory.records,
      myAccount.chartHistory.map((p) => ({
        date: String(p.date),
        principal: Number(p.principal ?? 0),
        investment: Number(p.investment ?? 0),
      })),
      fullMarketHistory,
      livePrices,
    );
  }, [myAccount, fullMarketHistory, livePrices, dbHistory.records]);

  const filteredRecords = useMemo(() => {
    let list = [...dbHistory.records].reverse();
    if (historyFilterMonth)
      list = list.filter((r) => r.date.startsWith(historyFilterMonth));
    if (historyFilterAsset)
      list = list.filter((r) => r.asset_key === historyFilterAsset);
    return list;
  }, [dbHistory.records, historyFilterMonth, historyFilterAsset]);

  if (loading || !myAccount || !buyPlan) return <LoadingScreen />;

  const {
    currentCashBalance,
    portfolio,
    totalAsset,
    totalInvested,
    chartHistory,
    currentExchangeRate,
    currentPriceMap,
  } = myAccount;
  const { guide, thisMonthResidue, totalExpectedSpend } = buyPlan;
  const currentMonth = Number(currentYearMonth().slice(5, 7));

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8 text-[var(--foreground)] font-sans transition-colors flex justify-center">
      <ToastContainer />
      <div className="w-full max-w-6xl space-y-6">
        <GoalToastBar
          goalToast={goalToast}
          goalRoi={goalRoi}
          goalAsset={goalAsset}
          currentRoi={totalRoi}
          currentAsset={totalAsset}
          formatNum={formatNum}
          onClose={closeGoalToast}
        />

        {/* 섹션 그룹 앵커 네비게이션 */}
        <SectionNav />

        {/* 총자산 요약 — 최상단 고정 배치 */}
        <header className="flex flex-col justify-between items-start gap-4">
          <HeaderSection
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onExportCSV={handleExportCSV}
            onOpenSettings={() => setShowSettings(true)}
            onRefreshPrices={loadAllData}
            isRefreshingPrice={isRefreshingPrice}
            onOpenDeleteByDate={deleteByDate.openModal}
            onOpenSellRecord={() => setShowSellModal(true)}
            totalInvested={totalInvested}
            totalAsset={totalAsset}
            totalRoi={totalRoi}
            hideReturns={hideReturns}
            onToggleHideReturns={() => setHideReturns(!hideReturns)}
            priceFetchedAt={marketMeta.fetchedAt}
            priceStaleLabels={[
              ...marketMeta.staleKeys.map((k) => NAMES[k] ?? k),
              ...(marketMeta.exStale ? ['환율'] : []),
            ]}
            priceError={marketMeta.error}
          />
        </header>

        {/* ══ ① 이번 달 실행: 입금 → 매수 ══ */}
        <div id="section-monthly" className="space-y-6 scroll-mt-20">
        <MonthlyOverviewSection
          dbHistoryBudgets={dbHistory.budgets}
          inputBudget={inputBudget}
          setInputBudget={setInputBudget}
          currentExchangeRate={currentExchangeRate}
          totalExpectedSpend={totalExpectedSpend}
          currentCashBalance={currentCashBalance}
          cumulativeCmaInterestToToday={
            myAccount.cumulativeCmaInterestToToday ?? 0
          }
          cmaRate={cmaRate}
          emergencyFundAmount={emergencyFundAmount}
          formatNum={formatNum}
        />

        <BuyGuideSection
          currentMonth={currentMonth}
          onSaveClick={saveMonthlyRecord}
          isSaving={isSaving}
          dbHistoryBudgets={dbHistory.budgets}
          guide={guide}
          names={NAMES}
          assetGroups={ASSET_MARKET_GROUPS}
          manualEdits={manualEdits}
          setManualEdits={setManualEdits}
          thisMonthResidue={thisMonthResidue}
          formatNum={formatNum}
        />
        </div>

        {/* ══ ② 자산 점검: 보유 현황 → 리밸런싱 → 성과 분석 ══ */}
        <div id="section-portfolio" className="space-y-6 scroll-mt-20">
        {/* 현재 보유 수량 / 평단 요약 */}
        <HoldingsSummarySection
          portfolio={portfolio}
          names={NAMES}
          colors={COLORS}
          assetGroups={ASSET_MARKET_GROUPS}
          formatNum={formatNum}
          formatDec={formatDec}
          currentPriceMap={currentPriceMap}
        />

        {showRebalancingQuarterBanner && (
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-amber-200 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
              이번 분기 리밸런싱을 고려해 보세요.
            </p>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const m = now.getMonth() + 1;
                const y = now.getFullYear();
                const q = Math.ceil(m / 3);
                localStorage.setItem(
                  STORAGE_KEYS.rebalancingAlertQuarter,
                  `${y}-Q${q}`
                );
                setShowRebalancingQuarterBanner(false);
                setShowRebalancingModal(true);
              }}
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
        {rebalancingData && (
          <RebalancingGuideModal
            open={showRebalancingModal}
            onClose={() => setShowRebalancingModal(false)}
            totalAsset={rebalancingData.totalAsset}
            items={rebalancingData.items}
            formatNum={formatNum}
            history={rebalancingHistory}
            onSaveSnapshot={() => {
              const snapshot = {
                date: todayISO(),
                totalAsset: rebalancingData.totalAsset,
                items: rebalancingData.items,
              };
              const updated = [snapshot, ...rebalancingHistory].slice(0, 20);
              setRebalancingHistory(updated);
              localStorage.setItem('asset-tracker-rebalancing-history', JSON.stringify(updated));
              toast.success('리밸런싱 스냅샷이 저장되었습니다.');
            }}
          />
        )}

        {/* 3. 보유 자산 현황 (DB) */}
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

        {/* 벤치마크 대비 수익률 비교 */}
        <BenchmarkComparisonSection
          points={benchmarkData.points}
          results={benchmarkData.results}
          formatNum={formatNum}
          darkMode={darkMode}
        />

        {/* 명목 vs 실질 수익률 */}
        <RealReturnSection
          totalAsset={totalAsset}
          totalInvested={totalInvested}
          totalDividends={myAccount.totalDividends ?? 0}
          cumulativeCmaInterest={myAccount.cumulativeCmaInterestToToday ?? 0}
          oldestDepositDate={dbHistory.budgets[0]?.month_date ?? todayISO()}
          budgets={dbHistory.budgets}
          formatNum={formatNum}
        />
        </div>

        {/* ══ ③ 마인드셋: 규율·감정 방어 ══ */}
        <div id="section-mindset" className="space-y-6 scroll-mt-20">
        {/* 투자 규칙 (IPS) — 감정 방어 */}
        <InvestmentPolicySection rules={policyRules} onSave={setPolicyRules} />

        {/* 거래 빈도 경고 (Barber-Odean) */}
        <TradingFrequencyMonitor records={dbHistory.records} />

        {/* 연속 적립 스트릭 */}
        <InvestmentStreakSection budgets={dbHistory.budgets} />

        {/* 감정 일기 */}
        <EmotionJournalSection
          totalAsset={totalAsset}
          formatNum={formatNum}
        />

        {/* "만약 그때 매도했다면?" 시뮬레이터 — 감정 매도 학습 */}
        <WhatIfSection
          records={dbHistory.records}
          marketHistory={fullMarketHistory}
          livePrices={livePrices}
          formatNum={formatNum}
        />
        </div>

        {/* ══ ④ 세금·배당 ══ */}
        <div id="section-tax" className="space-y-6 scroll-mt-20">
        {/* 배당금 내역 */}
        <DividendSection
          dividends={dbHistory.dividends}
          names={NAMES}
          formatNum={formatNum}
          onAddDividend={ledger.addDividend}
          onDeleteDividend={ledger.deleteDividend}
        />

        {/* ISA 세금 (가입 이후 누적) */}
        <TaxSimulationSection
          taxData={taxSimulation}
          formatNum={formatNum}
          showBtc={(portfolio.btc?.qty ?? 0) > 0 || taxSimulation.btcGain > 0}
        />

        {/* 환율 영향 분석 */}
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

        {/* ══ ⑤ 목표·기록 ══ */}
        <div id="section-goals" className="space-y-6 scroll-mt-20">
        {/* 목표 설정 */}
        <GoalSection
          goalRoi={goalRoi}
          goalAsset={goalAsset}
          storageKeys={{
            goalRoi: STORAGE_KEYS.goalRoi,
            goalAsset: STORAGE_KEYS.goalAsset,
          }}
          setGoalRoi={setGoalRoi}
          setGoalAsset={setGoalAsset}
        />

        {/* 목표 달성 예측 */}
        <GoalProjectionSection
          currentAsset={totalAsset}
          monthlyInvestment={inputBudget}
          totalInvested={totalInvested}
          goalAsset={goalAsset}
          formatNum={formatNum}
          estimateGoalDate={estimateGoalDate}
          mdd={mddValue}
        />

        {/* 3가지 시나리오 목표 */}
        <GoalScenariosSection
          totalAsset={totalAsset}
          monthlyDeposit={inputBudget}
          goalAsset={goalAsset}
          formatNum={formatNum}
        />

        <InvestmentHistorySection
          open={showHistory}
          onToggle={() => setShowHistory(!showHistory)}
          filterMonth={historyFilterMonth}
          filterAsset={historyFilterAsset}
          onFilterMonthChange={setHistoryFilterMonth}
          onFilterAssetChange={setHistoryFilterAsset}
          records={filteredRecords}
          allRecords={dbHistory.records}
          names={NAMES}
          formatNum={formatNum}
          formatDec={formatDec}
          onSaveAmountOverride={ledger.saveBtcAmountOverride}
        />

        <DepositsHistorySection
          open={showDeposits}
          onToggle={() => setShowDeposits(!showDeposits)}
          budgets={dbHistory.budgets}
          formatNum={formatNum}
        />

        {/* 데이터 무결성 점검 */}
        <DataIntegritySection
          records={dbHistory.records}
          batchSummaries={dbHistory.batchSummaries}
          budgets={dbHistory.budgets}
          formatNum={formatNum}
        />
        </div>

        {/* 매도 기록 모달 */}
        <SellRecordModal
          open={showSellModal}
          onClose={() => setShowSellModal(false)}
          portfolio={portfolio}
          names={NAMES}
          currentPriceMap={currentPriceMap}
          formatNum={formatNum}
          formatDec={formatDec}
          onSave={sellFlow.submitSell}
          isSaving={isSaving}
        />

        {/* IPS 점검 경고 모달 */}
        <IpsViolationModal
          open={sellFlow.isReviewing}
          violations={sellFlow.violations}
          policyRules={policyRules}
          onProceed={sellFlow.proceedAnyway}
          onCancel={sellFlow.cancelSell}
        />

        <DeleteByDateModal
          open={deleteByDate.open}
          onClose={deleteByDate.close}
          recordBatches={deleteByDate.recordBatches}
          selectedKeys={deleteByDate.selectedKeys}
          onToggleBatch={deleteByDate.toggleBatch}
          onConfirm={deleteByDate.confirmDelete}
          isDeleting={deleteByDate.isDeleting}
        />

        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          storageKeyBudget={STORAGE_KEYS.budget}
          inputBudget={inputBudget}
          setInputBudget={setInputBudget}
          customRatios={customRatios}
          setCustomRatios={setCustomRatios}
          names={NAMES}
          defaultRatios={DEFAULT_RATIOS}
          storageKeyRatios={STORAGE_KEYS.ratios}
          ratioPresets={RATIO_PRESETS}
          cmaRate={cmaRate}
          setCmaRate={setCmaRate}
          storageKeyCmaRate={STORAGE_KEYS.cmaRate}
          emergencyFundAmount={emergencyFundAmount}
          setEmergencyFundAmount={setEmergencyFundAmount}
          saveEmergencyFundToDb={ledger.saveEmergencyFundToDb}
          onResetDb={ledger.resetDb}
          isResetting={ledger.isResetting}
        />
      </div>
    </div>
  );
}
