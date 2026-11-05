'use client';

import React, { useMemo } from 'react';
import type { DbHistory, MarketDataPoint, MyAccountData } from '@/lib/types';
import type { AppSettings, SettingsPatch } from '@/lib/settings';
import { isMarketDip, marketDips } from '@/lib/monthly';
import { currentYearMonth } from '@/lib/date';
import { SummaryCard } from '../month/SummaryCard';
import { MarketDipCard } from '../month/MarketDipCard';
import { MonthlyPlanCard } from '../month/MonthlyPlanCard';
import { InvestmentStreakSection } from '../InvestmentStreakSection';

type MonthTabProps = {
  myAccount: MyAccountData;
  dbHistory: DbHistory;
  fullMarketHistory: MarketDataPoint[];
  settings: AppSettings;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
  hideReturns: boolean;
  reload: () => Promise<void>;
};

/** 이번 달 — 요약 → (하락장 안내) → 적립 계산·기록 → 연속 적립 */
export function MonthTab({
  myAccount, dbHistory, fullMarketHistory, settings, updateSettings, hideReturns, reload,
}: MonthTabProps) {
  const dips = useMemo(
    () => marketDips(fullMarketHistory, myAccount.currentPriceMap, currentYearMonth()),
    [fullMarketHistory, myAccount.currentPriceMap],
  );
  const hasDip = isMarketDip(dips);

  // 모바일: 한 줄로 요약 → 하락장 → 적립 → 연속 적립
  // 넓은 화면(lg): 왼쪽 요약·하락장·연속 적립, 오른쪽 적립 계산
  return (
    <div
      className={`grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 ${
        hasDip ? 'lg:grid-rows-[auto_auto_1fr]' : 'lg:grid-rows-[auto_1fr]'
      }`}
    >
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <SummaryCard
          totalAsset={myAccount.totalAsset}
          totalInvested={myAccount.totalInvested}
          budgets={dbHistory.budgets}
          hideReturns={hideReturns}
        />
      </div>
      {hasDip && (
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <MarketDipCard dips={dips} />
        </div>
      )}
      <div className={`min-w-0 lg:col-start-2 lg:row-start-1 ${hasDip ? 'lg:row-span-3' : 'lg:row-span-2'}`}>
        <MonthlyPlanCard
          myAccount={myAccount}
          dbHistory={dbHistory}
          settings={settings}
          updateSettings={updateSettings}
          reload={reload}
        />
      </div>
      <div className={`min-w-0 lg:col-start-1 lg:self-start ${hasDip ? 'lg:row-start-3' : 'lg:row-start-2'}`}>
        <InvestmentStreakSection budgets={dbHistory.budgets} />
      </div>
    </div>
  );
}
