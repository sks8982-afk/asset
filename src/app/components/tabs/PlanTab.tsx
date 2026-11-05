'use client';

import React from 'react';
import type { DbHistory, MyAccountData } from '@/lib/types';
import type { AppSettings, SettingsPatch } from '@/lib/settings';
import { GoalCard } from '../plan/GoalCard';
import { IsaPlanCard } from '../plan/IsaPlanCard';
import { InvestmentPolicySection } from '../InvestmentPolicySection';

type PlanTabProps = {
  myAccount: MyAccountData;
  dbHistory: DbHistory;
  settings: AppSettings;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
  hideReturns: boolean;
};

/** 계획 — 목표 · ISA 계획 · 투자 원칙 */
export function PlanTab({ myAccount, dbHistory, settings, updateSettings, hideReturns }: PlanTabProps) {
  // 모바일: 목표 → ISA → 원칙 / 넓은 화면(lg): 왼쪽 목표·원칙, 오른쪽 ISA
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-6">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <GoalCard
          totalAsset={myAccount.totalAsset}
          goalAsset={settings.goalAsset}
          monthlyBudget={settings.monthlyBudget}
          onSaveGoal={(goalAsset) => void updateSettings({ goalAsset })}
          hideReturns={hideReturns}
        />
      </div>
      <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <IsaPlanCard dbHistory={dbHistory} prices={myAccount.currentPriceMap} isaOpenDate={settings.isaOpenDate} />
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:self-start">
        <InvestmentPolicySection rules={settings.ipsRules} onSave={(ipsRules) => void updateSettings({ ipsRules })} />
      </div>
    </div>
  );
}
