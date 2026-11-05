'use client';

import React, { useMemo } from 'react';
import type { DbHistory, LivePrices, MarketDataPoint, MyAccountData } from '@/lib/types';
import type { AppSettings, SettingsPatch } from '@/lib/settings';
import {
  buildFlowAdjustedIndex, calculateMDD, calculateTaxSimulation, estimateGoalDate, formatNum,
} from '@/lib/utils';
import { GoalSection } from '../GoalSection';
import { GoalProjectionSection } from '../GoalProjectionSection';
import { GoalScenariosSection } from '../GoalScenariosSection';
import { TaxSimulationSection } from '../TaxSimulationSection';
import { InvestmentPolicySection } from '../InvestmentPolicySection';
import { TradingFrequencyMonitor } from '../TradingFrequencyMonitor';
import { WhatIfSection } from '../WhatIfSection';
import { EmotionJournalSection } from '../EmotionJournalSection';

type PlanTabProps = {
  myAccount: MyAccountData;
  dbHistory: DbHistory;
  fullMarketHistory: MarketDataPoint[];
  livePrices: LivePrices | null;
  settings: AppSettings;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
};

/** 계획 (임시 구성 — 기존 섹션을 그대로 옮김): 목표 · ISA 세금 · 투자 원칙 · 마인드셋 */
export function PlanTab({ myAccount, dbHistory, fullMarketHistory, livePrices, settings, updateSettings }: PlanTabProps) {
  const { totalAsset, totalInvested, chartHistory, portfolio } = myAccount;

  /** ISA 세금 — 가입 이후 누적 */
  const taxSimulation = useMemo(
    () => calculateTaxSimulation(dbHistory.records, dbHistory.dividends),
    [dbHistory.records, dbHistory.dividends],
  );

  /** MDD — 입금 흐름 조정 지수 기준 (신규 입금이 낙폭을 가리지 않도록) */
  const mdd = useMemo(() => {
    if (!chartHistory.length) return 0;
    const index = buildFlowAdjustedIndex(
      chartHistory.map((p) => ({ principal: Number(p.principal) || 0, investment: Number(p.investment) || 0 })),
    );
    return calculateMDD(index).mdd;
  }, [chartHistory]);

  return (
    <div className="space-y-6">
      <GoalSection
        key={settings.goalAsset}
        goalAsset={settings.goalAsset}
        onSave={(goalAsset) => void updateSettings({ goalAsset })}
      />
      <GoalProjectionSection
        currentAsset={totalAsset}
        monthlyInvestment={settings.monthlyBudget}
        totalInvested={totalInvested}
        goalAsset={settings.goalAsset}
        formatNum={formatNum}
        estimateGoalDate={estimateGoalDate}
        mdd={mdd}
      />
      <GoalScenariosSection
        totalAsset={totalAsset}
        monthlyDeposit={settings.monthlyBudget}
        goalAsset={settings.goalAsset}
        formatNum={formatNum}
      />

      <TaxSimulationSection
        taxData={taxSimulation}
        formatNum={formatNum}
        showBtc={(portfolio.btc?.qty ?? 0) > 0 || taxSimulation.btcGain > 0}
      />

      <InvestmentPolicySection
        rules={settings.ipsRules}
        onSave={(ipsRules) => void updateSettings({ ipsRules })}
      />
      <TradingFrequencyMonitor records={dbHistory.records} />
      <WhatIfSection
        records={dbHistory.records}
        marketHistory={fullMarketHistory}
        livePrices={livePrices}
        formatNum={formatNum}
      />
      <EmotionJournalSection totalAsset={totalAsset} formatNum={formatNum} />
    </div>
  );
}
