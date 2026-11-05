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
import { TabNav, tabElementId, tabPanelId } from './components/TabNav';
import { SettingsModal } from './components/SettingsModal';
import { MonthTab } from './components/tabs/MonthTab';
import { CheckTab } from './components/tabs/CheckTab';
import { PlanTab } from './components/tabs/PlanTab';
import { RecordsTab } from './components/tabs/RecordsTab';

export default function RealDbTower() {
  const [darkMode, setDarkMode] = useDarkMode();
  const [hideReturns, setHideReturns] = useHideReturns();
  const [activeTab, selectTab] = useHashTab();
  const { settings, ready: settingsReady, updateSettings } = useSettings();
  const {
    loading,
    isRefreshing,
    marketData,
    fullMarketHistory,
    livePrices,
    marketMeta,
    dbHistory,
    setDbHistory,
    reload,
  } = useAppData();
  const myAccount = useMyAccount({ marketData, livePrices, dbHistory, cmaRate: settings.cmaRate });
  const ledger = useLedgerMutations({ reload, setDbHistory });
  const [showSettings, setShowSettings] = useState(false);
  const { goalToast, closeGoalToast } = useGoalToast({
    ready: myAccount != null,
    totalAsset: myAccount?.totalAsset ?? 0,
    goalAsset: settings.goalAsset,
  });

  if (loading || !settingsReady || !myAccount) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8 text-[var(--foreground)] font-sans transition-colors flex justify-center">
      <ToastContainer />
      <div className="w-full max-w-6xl space-y-4">
        <GoalToastBar
          open={goalToast}
          goalAsset={settings.goalAsset}
          currentAsset={myAccount.totalAsset}
          formatNum={formatNum}
          onClose={closeGoalToast}
        />

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
        />

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
            />
          )}
          {activeTab === 'plan' && (
            <PlanTab
              myAccount={myAccount}
              dbHistory={dbHistory}
              fullMarketHistory={fullMarketHistory}
              livePrices={livePrices}
              settings={settings}
              updateSettings={updateSettings}
            />
          )}
          {activeTab === 'records' && (
            <RecordsTab
              myAccount={myAccount}
              dbHistory={dbHistory}
              reload={reload}
              policyRules={settings.ipsRules}
              addDividend={ledger.addDividend}
              deleteDividend={ledger.deleteDividend}
              saveBtcAmountOverride={ledger.saveBtcAmountOverride}
            />
          )}
        </div>

        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={updateSettings}
          onResetDb={ledger.resetDb}
          isResetting={ledger.isResetting}
        />
      </div>
    </div>
  );
}
