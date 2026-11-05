'use client';
import React, { useState } from 'react';
import { NAMES } from '@/lib/constants';
import { formatNum } from '@/lib/utils';
import { useDarkMode } from './hooks/useDarkMode';
import { useHideReturns } from './hooks/useHideReturns';
import { useHashTab } from './hooks/useHashTab';
import { useSettings } from './hooks/useSettings';
import { useAppData } from './hooks/useAppData';
import { useMyAccount } from './hooks/useMyAccount';
import { useGoalToast } from './hooks/useGoalToast';
import { useLedgerMutations } from './hooks/useLedgerMutations';
import { ToastContainer } from './components/ToastContainer';
import { LoadingScreen } from './components/LoadingScreen';
import { GoalToastBar } from './components/GoalToastBar';
import { HeaderSection } from './components/HeaderSection';
import { LedgerLoadErrorBanner } from './components/LedgerLoadErrorBanner';
import { TabNav, tabElementId, tabPanelId } from './components/TabNav';
import { SettingsModal } from './components/SettingsModal';
import { Card } from './components/ui/Card';
import { NOTE_CLASS } from './components/ui/styles';
import { MonthTab } from './components/tabs/MonthTab';
import { CheckTab } from './components/tabs/CheckTab';
import { PlanTab } from './components/tabs/PlanTab';
import { RecordsTab } from './components/tabs/RecordsTab';

export default function RealDbTower() {
  const [darkMode, setDarkMode] = useDarkMode();
  const [hideReturns, setHideReturns] = useHideReturns();
  const [activeTab, selectTab] = useHashTab();
  const { settings, ready: settingsReady, unavailable: settingsUnavailable, updateSettings } = useSettings();
  const {
    loading,
    isRefreshing,
    marketData,
    fullMarketHistory,
    livePrices,
    marketMeta,
    indices,
    dbHistory,
    dbLoaded,
    dbLoadError,
    setDbHistory,
    reload,
  } = useAppData();
  const myAccount = useMyAccount({ marketData, livePrices, dbHistory, cmaRate: settings.cmaRate });
  // 장부를 제대로 불러온 상태에서만 쓴다 — 못 불러온 동안 쓰면 이전 값 위에 덮어쓰게 된다
  const canWrite = dbLoaded && dbLoadError == null;
  const ledger = useLedgerMutations({ reload, setDbHistory, canWrite });
  const [showSettings, setShowSettings] = useState(false);
  const { goalToast, closeGoalToast } = useGoalToast({
    ready: myAccount != null && dbLoaded,
    totalAsset: myAccount?.totalAsset ?? 0,
    goalAsset: settings.goalAsset,
  });

  if (loading || !settingsReady) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8 text-[var(--foreground)] font-sans transition-colors flex justify-center">
      <ToastContainer />
      <div className="w-full max-w-6xl space-y-4">
        {dbLoadError && (
          <LedgerLoadErrorBanner message={dbLoadError} showingPrevious={dbLoaded} onRetry={reload} retrying={isRefreshing} />
        )}
        {myAccount && (
          <GoalToastBar
            open={goalToast}
            goalAsset={settings.goalAsset}
            currentAsset={myAccount.totalAsset}
            formatNum={formatNum}
            onClose={closeGoalToast}
          />
        )}

        <HeaderSection
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onOpenSettings={() => setShowSettings(true)}
          onRefreshPrices={reload}
          isRefreshingPrice={isRefreshing}
          hideReturns={hideReturns}
          onToggleHideReturns={() => setHideReturns(!hideReturns)}
          priceFetchedAt={marketMeta.fetchedAt}
          priceStaleLabels={[
            ...marketMeta.staleKeys.map((k) => NAMES[k] ?? k),
            ...(marketMeta.exStale ? ['환율'] : []),
          ]}
          priceError={marketMeta.error}
          indices={indices}
        />

        {/* 장부를 한 번도 못 불러왔으면 탭을 그리지 않는다 — 빈 장부(0원)처럼 보이지 않도록 위 배너만 */}
        {dbLoaded && !myAccount && (
          <Card>
            <p className={NOTE_CLASS}>시세를 불러오지 못해 화면을 그릴 수 없습니다. 오른쪽 위 새로고침 버튼으로 다시 시도해 주세요.</p>
          </Card>
        )}
        {dbLoaded && myAccount && (
          <>
            <TabNav active={activeTab} onSelect={selectTab} />

            <div role="tabpanel" id={tabPanelId(activeTab)} aria-labelledby={tabElementId(activeTab)} className="pt-2">
              {activeTab === 'month' && (
                <MonthTab
                  myAccount={myAccount}
                  dbHistory={dbHistory}
                  fullMarketHistory={fullMarketHistory}
                  settings={settings}
                  updateSettings={updateSettings}
                  hideReturns={hideReturns}
                  reload={reload}
                  canWrite={canWrite}
                  settingsUnavailable={settingsUnavailable}
                />
              )}
              {activeTab === 'check' && (
                <CheckTab
                  myAccount={myAccount}
                  dbHistory={dbHistory}
                  fullMarketHistory={fullMarketHistory}
                  livePrices={livePrices}
                  coreWeights={settings.coreWeights}
                  darkMode={darkMode}
                  hideReturns={hideReturns}
                />
              )}
              {activeTab === 'plan' && (
                <PlanTab
                  myAccount={myAccount}
                  dbHistory={dbHistory}
                  settings={settings}
                  updateSettings={updateSettings}
                  hideReturns={hideReturns}
                />
              )}
              {activeTab === 'records' && (
                <RecordsTab
                  myAccount={myAccount}
                  dbHistory={dbHistory}
                  reload={reload}
                  canWrite={canWrite}
                  policyRules={settings.ipsRules}
                  addDividend={ledger.addDividend}
                  deleteDividend={ledger.deleteDividend}
                  saveBtcAmountOverride={ledger.saveBtcAmountOverride}
                />
              )}
            </div>
          </>
        )}

        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={updateSettings}
          onResetDb={ledger.resetDb}
          isResetting={ledger.isResetting}
          canResetDb={canWrite}
        />
      </div>
    </div>
  );
}
