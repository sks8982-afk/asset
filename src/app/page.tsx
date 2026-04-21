'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  DividendRecord, MarketSignal, BuyGuideItem,
} from '@/lib/types';
import { useDarkMode } from './hooks/useDarkMode';
import { useLocalStorageNumber } from './hooks/useLocalStorageNumber';
import { useCustomRatios } from './hooks/useCustomRatios';
import { useRebalancingHistory } from './hooks/useRebalancingHistory';
import { useQuarterlyRebalancingBanner } from './hooks/useQuarterlyBanner';
import { useAppData } from './hooks/useAppData';
import { useHideReturns } from './hooks/useHideReturns';
import { toast } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';
import {
  STORAGE_KEYS, COLORS, NAMES, DEFAULT_RATIOS,
  ASSET_MARKET_GROUPS, RATIO_PRESETS, RESET_DB_PASSWORD, FOREIGN_ASSET_KEYS,
} from '@/lib/constants';
import {
  getRecordAmount, getRecordQty, filterBuyRecords, filterSellRecords,
  getCumulativeInterestByMonths, getInterestFromMonthStartToToday,
  formatNum, formatDec, calculateRealizedPnl, calculateTaxSimulation,
  estimateGoalDate, calculateMDD, calculateMarketSignal, calculateBenchmarkComparison,
} from '@/lib/utils';
import { HeaderSection } from './components/HeaderSection';
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
import { PanicBuyBanner } from './components/PanicBuyBanner';
import { PasswordConfirmModal } from './components/PasswordConfirmModal';
import { DeleteByDateModal } from './components/DeleteByDateModal';
import { SettingsModal } from './components/SettingsModal';
import { GoalToastBar } from './components/GoalToastBar';
import { LoadingScreen } from './components/LoadingScreen';
import { SellRecordModal } from './components/SellRecordModal';
import { DividendSection } from './components/DividendSection';
import { TaxSimulationSection } from './components/TaxSimulationSection';
import { GoalProjectionSection } from './components/GoalProjectionSection';
import { ExchangeRateSection } from './components/ExchangeRateSection';
import { MarketSignalSection } from './components/MarketSignalSection';
import { BenchmarkComparisonSection } from './components/BenchmarkComparisonSection';
import { InvestmentPolicySection } from './components/InvestmentPolicySection';
import { InvestmentStreakSection } from './components/InvestmentStreakSection';
import { WhatIfSection } from './components/WhatIfSection';
import { SignalAlertBanner } from './components/SignalAlertBanner';
import { TaxLossHarvestingSection } from './components/TaxLossHarvestingSection';
import { RealReturnSection } from './components/RealReturnSection';
import { EmotionJournalSection } from './components/EmotionJournalSection';
import { ProfitTakingGuideSection } from './components/ProfitTakingGuideSection';
import { GoalScenariosSection } from './components/GoalScenariosSection';
import { DataIntegritySection } from './components/DataIntegritySection';

export default function RealDbTower() {
  const [inputBudget, setInputBudget] = useLocalStorageNumber(STORAGE_KEYS.budget, 1300000, 1);
  const [cmaRate, setCmaRate] = useLocalStorageNumber(STORAGE_KEYS.cmaRate, 1.95, 0);
  const [goalRoi, setGoalRoi] = useLocalStorageNumber(STORAGE_KEYS.goalRoi, 7, 0);
  const [goalAsset, setGoalAsset] = useLocalStorageNumber(STORAGE_KEYS.goalAsset, 100000000, 0);
  const [darkMode, setDarkMode] = useDarkMode();
  const [customRatios, setCustomRatios] = useCustomRatios();
  const [rebalancingHistory, setRebalancingHistory] = useRebalancingHistory();
  const [showRebalancingQuarterBanner, setShowRebalancingQuarterBanner] = useQuarterlyRebalancingBanner();
  const [hideReturns, setHideReturns] = useHideReturns();

  const {
    loading,
    isRefreshing: isRefreshingPrice,
    marketData,
    fullMarketHistory,
    livePrices,
    marketIndices,
    dbHistory,
    setDbHistory,
    emergencyFundAmount,
    setEmergencyFundAmount,
    reload: loadAllData,
  } = useAppData();

  const [isPanicBuyMode, setIsPanicBuyMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [manualEdits, setManualEdits] = useState<Record<string, number>>({});
  const [goalToast, setGoalToast] = useState<'roi' | 'asset' | null>(null);
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
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showPanicBuyPasswordModal, setShowPanicBuyPasswordModal] =
    useState(false);
  const [panicBuyPasswordInput, setPanicBuyPasswordInput] = useState('');
  const [showDeleteByDateModal, setShowDeleteByDateModal] = useState(false);
  const [deleteByDateSelected, setDeleteByDateSelected] = useState<string[]>(
    [],
  );
  const [deleteByDatePassword, setDeleteByDatePassword] = useState('');
  const [isDeletingByDate, setIsDeletingByDate] = useState(false);
  const [showRebalancingModal, setShowRebalancingModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [signalAlertDismissed, setSignalAlertDismissed] = useState(false);

  const getRatios = useCallback((): Record<string, number> => {
    return { ...DEFAULT_RATIOS, ...(customRatios ?? {}) };
  }, [customRatios]);

  const ratioSum = useMemo(() => {
    const r = getRatios();
    return Object.values(r).reduce((a, b) => a + b, 0);
  }, [getRatios]);

  const saveEmergencyFundToDb = useCallback(async (amount: number) => {
    if (!Number.isFinite(amount) || amount < 0) return;
    try {
      await supabase.from('app_settings').upsert(
        {
          id: 1,
          emergency_fund_amount: amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      setEmergencyFundAmount(amount);
    } catch {
      setEmergencyFundAmount(amount);
    }
  }, [setEmergencyFundAmount]);

  const saveBtcAmountOverride = useCallback(
    async (recordId: string, amountOverride: number | null) => {
      try {
        await supabase
          .from('investment_records')
          .update({
            amount_override: amountOverride,
          })
          .eq('id', recordId);
        setDbHistory((prev) => ({
          ...prev,
          records: prev.records.map((r) =>
            r.id === recordId
              ? { ...r, amount_override: amountOverride }
              : r,
          ),
        }));
      } catch {
        toast.error('매수액 수정 저장에 실패했습니다.');
      }
    },
    [setDbHistory],
  );

  /** 매도 기록 저장 */
  const handleSellRecord = useCallback(async (sellData: {
    asset_key: string; quantity: number; price: number; amount: number; date: string;
    reason?: string;
  }) => {
    try {
      await supabase.from('investment_records').insert({
        date: sellData.date,
        asset_key: sellData.asset_key,
        price: sellData.price,
        quantity: sellData.quantity,
        amount: sellData.amount,
        type: 'sell',
      });
      toast.success('매도 기록이 저장되었습니다.');
      loadAllData();
    } catch {
      toast.error('매도 기록 저장에 실패했습니다.');
    }
  }, [loadAllData]);

  /** 배당금 추가 */
  const handleAddDividend = useCallback(async (dividend: Omit<DividendRecord, 'id'>) => {
    try {
      await supabase.from('dividends').insert(dividend);
      toast.success('배당금이 기록되었습니다.');
      loadAllData();
    } catch {
      toast.error('배당금 저장에 실패했습니다.');
    }
  }, [loadAllData]);

  /** 배당금 삭제 */
  const handleDeleteDividend = useCallback(async (id: string) => {
    try {
      await supabase.from('dividends').delete().eq('id', id);
      toast.info('배당금이 삭제되었습니다.');
      loadAllData();
    } catch {
      toast.error('배당금 삭제에 실패했습니다.');
    }
  }, [loadAllData]);

  useEffect(() => {
    setCurrentMonth(new Date().getMonth() + 1);
  }, []);

  // 1. 내 자산 현황 분석 (DB 기준)
  const myAccount = useMemo(() => {
    if (!marketData.length) return null;
    const lastHistoryPoint = marketData[marketData.length - 1];
    const currentPriceMap = livePrices || lastHistoryPoint;
    const prevPriceMap = marketData[marketData.length - 2] || lastHistoryPoint;

    const totalDeposit = dbHistory.budgets.reduce(
      (acc, cur) => acc + Number(cur.amount),
      0,
    );
    const buyRecords = filterBuyRecords(dbHistory.records);
    const sellRecords = filterSellRecords(dbHistory.records);
    const totalBought = buyRecords.reduce(
      (acc, cur) => acc + getRecordAmount(cur),
      0,
    );
    const totalSold = sellRecords.reduce(
      (acc, cur) => acc + getRecordAmount(cur),
      0,
    );
    const currentCashBalance = totalDeposit - totalBought + totalSold;

    // 실현 손익 계산
    const realizedPnlByAsset = calculateRealizedPnl(dbHistory.records);
    const totalRealizedPnl = Object.values(realizedPnlByAsset).reduce((a, b) => a + b, 0);

    // 배당 수익 합산
    const totalDividends = dbHistory.dividends.reduce((acc, d) => acc + d.amount, 0);

    const portfolio: Record<string, {
      qty: number; cost: number; avg: number; val: number;
      roi: number; weight: number; realizedPnl: number;
    }> = {};
    Object.keys(NAMES).forEach(
      (k) =>
        (portfolio[k] = { qty: 0, cost: 0, avg: 0, val: 0, roi: 0, weight: 0, realizedPnl: realizedPnlByAsset[k] ?? 0 }),
    );

    // 매수 기록 반영
    buyRecords.forEach((r) => {
      if (portfolio[r.asset_key]) {
        portfolio[r.asset_key].qty += getRecordQty(r);
        portfolio[r.asset_key].cost += getRecordAmount(r);
      }
    });
    // 매도 기록 반영 (수량 차감)
    sellRecords.forEach((r) => {
      if (portfolio[r.asset_key]) {
        portfolio[r.asset_key].qty -= getRecordQty(r);
      }
    });

    let totalStockValue = 0;
    Object.keys(portfolio).forEach((k) => {
      if (k === 'cash') return;
      const curP = Number(currentPriceMap[k]) || 0;
      portfolio[k].avg =
        portfolio[k].qty > 0 ? portfolio[k].cost / portfolio[k].qty : 0;
      portfolio[k].val = portfolio[k].qty * curP;
      portfolio[k].roi =
        portfolio[k].cost > 0
          ? (portfolio[k].val / portfolio[k].cost - 1) * 100
          : 0;
      totalStockValue += portfolio[k].val;
    });
    const totalAssetVal = totalStockValue + currentCashBalance;
    Object.keys(portfolio).forEach((k) => {
      if (k === 'cash')
        portfolio[k].weight =
          totalAssetVal > 0 ? (currentCashBalance / totalAssetVal) * 100 : 0;
      else
        portfolio[k].weight =
          totalAssetVal > 0 ? (portfolio[k].val / totalAssetVal) * 100 : 0;
    });

    // 일별 CMA 이자 누적 (월별 시점)
    const monthStrings = marketData.map((m) => m.d);
    const cumulativeInterestByMonth = getCumulativeInterestByMonths(
      monthStrings,
      dbHistory.budgets,
      dbHistory.records,
      cmaRate || 0,
    );

    // 차트 데이터 (DB기반 역추적) — 과거는 월별 시세, 마지막은 실시간 시세 반영
    const chartHistoryRaw = marketData.map((mPoint, idx) => {
      const date = mPoint.d;
      const depositUntilNow = dbHistory.budgets
        .filter((b) => b.month_date.substring(0, 7) <= date)
        .reduce((acc, cur) => acc + Number(cur.amount), 0);
      const recordsUntilNow = dbHistory.records.filter(
        (r) => r.date.substring(0, 7) <= date,
      );
      const spentUntilNow = recordsUntilNow.reduce(
        (acc, cur) => acc + getRecordAmount(cur),
        0,
      );
      const cashUntilNow = depositUntilNow - spentUntilNow;
      const cmaInterest = cumulativeInterestByMonth[idx] ?? 0;

      // 종목별 원금/시세 추적
      let stockValUntilNow = 0;
      const perAsset: Record<string, { principal: number; value: number }> = {};
      Object.keys(NAMES).forEach((k) => {
        if (k === 'cash') return;
        const assetRecords = recordsUntilNow.filter((r) => r.asset_key === k);
        const qty = assetRecords.reduce(
          (acc, cur) => acc + getRecordQty(cur),
          0,
        );
        const cost = assetRecords.reduce(
          (acc, cur) => acc + getRecordAmount(cur),
          0,
        );
        const value = qty * (Number(mPoint[k]) || 0);
        perAsset[k] = { principal: cost, value };
        stockValUntilNow += value;
      });

      const base: {
        date: string;
        principal: number;
        investment: number;
        cash: number;
        cmaInterest: number;
        [key: string]: string | number;
      } = {
        date,
        principal: depositUntilNow,
        investment: stockValUntilNow + cashUntilNow + cmaInterest,
        cash: cashUntilNow,
        cmaInterest,
      };

      // chartHistory 에 종목별 데이터도 함께 포함
      Object.keys(perAsset).forEach((k) => {
        base[`principal_${k}`] = perAsset[k].principal;
        base[`value_${k}`] = perAsset[k].value;
      });

      return base;
    });

    // 오늘까지의 누적 이자 (마지막 차트 포인트가 이번 달이면 해당 월 1일~오늘만, 아니면 지난달말+이번달 1일~오늘)
    const currentYearMonth = new Date()
      .toISOString()
      .slice(0, 7);
    const lastMonthInData = monthStrings[monthStrings.length - 1];
    const interestUpToToday =
      chartHistoryRaw.length > 0
        ? (lastMonthInData === currentYearMonth
            ? (cumulativeInterestByMonth[cumulativeInterestByMonth.length - 2] ??
                0)
            : cumulativeInterestByMonth[cumulativeInterestByMonth.length - 1] ??
              0) +
          getInterestFromMonthStartToToday(
            dbHistory.budgets,
            dbHistory.records,
            cmaRate || 0,
          )
        : 0;
    const chartHistory =
      chartHistoryRaw.length === 0
        ? chartHistoryRaw
        : livePrices
          ? chartHistoryRaw.slice(0, -1).concat({
              ...chartHistoryRaw[chartHistoryRaw.length - 1],
              investment:
                totalStockValue + currentCashBalance + interestUpToToday,
              cmaInterest: interestUpToToday,
            })
          : chartHistoryRaw;

    const isCrash = Object.keys(NAMES).some((k) => {
      if (k === 'cash' || k === 'btc') return false;
      const cur = Number(currentPriceMap[k]) || 0;
      const prev = Number(prevPriceMap[k]) || 0;
      if (prev <= 0) return false;
      return (cur / prev - 1) * 100 <= -10;
    });
    const currentExchangeRate = Number(currentPriceMap.ex) || 1350;

    return {
      currentCashBalance,
      portfolio,
      currentPriceMap,
      prevPriceMap,
      totalStockValue,
      totalAsset: totalStockValue + currentCashBalance + interestUpToToday,
      totalInvested: totalDeposit,
      isCrash,
      chartHistory,
      currentExchangeRate,
      cumulativeCmaInterestToToday: interestUpToToday,
      totalRealizedPnl,
      totalDividends,
    };
  }, [marketData, dbHistory, livePrices, cmaRate]);

  // 1.5. 매수 시그널 계산 (백테스팅 기반 5단계 시스템)
  // 전체 히스토리 사용 (MA12, 12개월 고점 등 장기 지표에 필요)
  const marketSignal: MarketSignal | null = useMemo(() => {
    if (!fullMarketHistory.length || !livePrices) return null;
    const assetKeys = Object.keys(NAMES).filter((k) => k !== 'cash');
    return calculateMarketSignal(fullMarketHistory, livePrices, assetKeys);
  }, [fullMarketHistory, livePrices]);

  // 2. 매수 가이드 계산 (시그널 기반 + 수동 추매 모드 호환)
  const buyPlan = useMemo(() => {
    if (!myAccount) return null;
    const { currentCashBalance, currentPriceMap, prevPriceMap, portfolio } =
      myAccount;
    const RATIOS = getRatios();

    const guide: Record<string, BuyGuideItem> = {};
    let totalMonthlySpend = 0;
    let totalExpectedSpend = 0;

    const assetKeys = Object.keys(RATIOS).filter((k) => k !== 'cash');

    // 전월 대비 등락률
    const dropByKey: Record<string, number> = {};
    assetKeys.forEach((k) => {
      const prevP = Number(prevPriceMap[k]) || 1;
      const curP = Number(currentPriceMap[k]) || 0;
      dropByKey[k] = (curP / prevP - 1) * 100;
    });

    // ── 시그널 기반 추가 예산 계산 ──
    // isPanicBuyMode(수동): 기존 로직 유지 (보유현금 99% 투입)
    // 시그널 자동: 개별 자산 시그널 배율로 추가 매수 (보유현금에서 차감)
    const useSignalMode = !isPanicBuyMode && marketSignal != null;
    const hasSignalBuy = useSignalMode &&
      Object.values(marketSignal.assetSignals).some((s) => s.multiplier > 1);

    // 수동 추매 예산 (기존 로직)
    let panicBudget = 0;
    if (isPanicBuyMode) {
      let baseMonthlySpendEstimate = 0;
      assetKeys.forEach((k) => {
        const curP = Number(currentPriceMap[k]) || 0;
        if (curP <= 0) return;
        const baseAlloc = inputBudget * (RATIOS[k] / ratioSum);
        const estBaseQty =
          k === 'btc' ? baseAlloc / curP : Math.floor(baseAlloc / curP);
        baseMonthlySpendEstimate += estBaseQty * curP;
      });
      const estResidue = Math.max(0, inputBudget - baseMonthlySpendEstimate);
      panicBudget = (currentCashBalance + estResidue) * 0.99;
    }

    // 시그널 추가매수 가용 예산 (보유현금의 일부를 시그널 강도에 비례해 투입)
    let signalExtraBudget = 0;
    if (hasSignalBuy && currentCashBalance > 0) {
      // 전체 시그널 점수에 따라 현금 투입 비율 결정
      // opportunity(36-55): 현금의 20%, strong_buy(56-75): 40%, all_in(76+): 70%
      const overallScore = marketSignal.overallScore;
      let cashUsePct = 0;
      if (overallScore >= 76) cashUsePct = 0.70;
      else if (overallScore >= 56) cashUsePct = 0.40;
      else if (overallScore >= 36) cashUsePct = 0.20;
      signalExtraBudget = currentCashBalance * cashUsePct;
    }

    const droppedAssets = assetKeys.filter((k) => dropByKey[k] <= -10);
    const halfRatioSum = assetKeys.reduce((s, k) => s + RATIOS[k] / 2, 0);
    const totalDropWeight =
      droppedAssets.length > 0
        ? droppedAssets.reduce((s, k) => s + Math.abs(dropByKey[k]), 0)
        : 0;

    // ── 비중 상한 체크 (목표 비중의 1.5배 초과 시 시그널 추매 차단) ──
    const WEIGHT_CAP_MULTIPLIER = 1.5;
    const weightCapped: Record<string, boolean> = {};
    assetKeys.forEach((k) => {
      const targetWeight = (RATIOS[k] / ratioSum) * 100; // 목표 비중 %
      const currentWeight = portfolio[k]?.weight ?? 0;    // 현재 비중 %
      weightCapped[k] = currentWeight > targetWeight * WEIGHT_CAP_MULTIPLIER;
    });

    // 시그널 가중치 합 (비중 상한 초과 종목 제외)
    const signalWeightSum = hasSignalBuy
      ? assetKeys.reduce((s, k) => {
          const sig = marketSignal.assetSignals[k];
          if (weightCapped[k]) return s; // 비중 상한 초과 → 제외
          return s + (sig && sig.multiplier > 1 ? sig.score * RATIOS[k] : 0);
        }, 0)
      : 0;

    assetKeys.forEach((k) => {
      const curP = Number(currentPriceMap[k]) || 0;
      const drop = dropByKey[k];

      const baseAlloc = inputBudget * (RATIOS[k] / ratioSum);
      let baseQty = 0;
      if (curP > 0) {
        if (k === 'btc') baseQty = baseAlloc / curP;
        else baseQty = Math.floor(baseAlloc / curP);
      }

      let extraQty = 0;

      if (isPanicBuyMode && panicBudget > 0 && curP > 0) {
        // ── 수동 추매 모드 (기존 로직 유지) ──
        let extraAlloc = 0;
        if (droppedAssets.length > 0) {
          const partHalf =
            halfRatioSum > 0
              ? panicBudget * 0.5 * (RATIOS[k] / 2 / halfRatioSum)
              : 0;
          const partDrop =
            totalDropWeight > 0 && drop <= -10
              ? panicBudget * 0.5 * (Math.abs(drop) / totalDropWeight)
              : 0;
          extraAlloc = partHalf + partDrop;
        } else {
          extraAlloc = panicBudget * (RATIOS[k] / ratioSum);
        }
        if (k === 'btc') extraQty = extraAlloc / curP;
        else extraQty = Math.floor(extraAlloc / curP);
      } else if (hasSignalBuy && signalExtraBudget > 0 && curP > 0) {
        // ── 시그널 기반 자동 추가매수 (비중 상한 체크) ──
        if (weightCapped[k]) {
          // 비중 상한 초과 → 추가매수 차단, 예산은 다른 종목에 재배분됨
          extraQty = 0;
        } else {
          const sig = marketSignal.assetSignals[k];
          if (sig && sig.multiplier > 1 && signalWeightSum > 0) {
            const weight = sig.score * RATIOS[k];
            const extraAlloc = signalExtraBudget * (weight / signalWeightSum);
            if (k === 'btc') extraQty = extraAlloc / curP;
            else extraQty = Math.floor(extraAlloc / curP);
          }
        }
      }

      // 수동 수정 반영 (Manual Override)
      let finalQty = baseQty + extraQty;
      if (manualEdits[k] !== undefined) {
        finalQty = manualEdits[k];
        extraQty = Math.max(0, finalQty - baseQty);
      }
      if (!Number.isFinite(finalQty) || finalQty < 0) finalQty = 0;
      if (!Number.isFinite(baseQty) || baseQty < 0) baseQty = 0;
      if (!Number.isFinite(extraQty) || extraQty < 0) extraQty = 0;

      const spent = finalQty * curP;
      const baseSpent = baseQty * curP;
      const actualBaseSpent = Math.min(spent, baseSpent);
      const isExtraMode = isPanicBuyMode || hasSignalBuy;
      const monthlySpendContribution = isExtraMode
        ? spent
        : manualEdits[k] !== undefined
          ? spent
          : actualBaseSpent;
      totalMonthlySpend += monthlySpendContribution;
      totalExpectedSpend += spent;

      guide[k] = {
        qty: finalQty,
        baseQty,
        extraQty,
        price: curP,
        spent: Number.isFinite(spent) ? spent : 0,
        drop: Number.isFinite(drop) ? drop : 0,
        weightCapped: weightCapped[k] ?? false,
      };
    });

    const isExtraMode = isPanicBuyMode || hasSignalBuy;
    const thisMonthResidue = isExtraMode
      ? inputBudget + myAccount.currentCashBalance - totalMonthlySpend
      : inputBudget - totalMonthlySpend;
    const cmaBalanceForInterest = isExtraMode
      ? thisMonthResidue
      : Math.max(0, myAccount.currentCashBalance) + Math.max(0, thisMonthResidue);
    const cmaMonthlyInterest =
      Math.max(0, cmaBalanceForInterest) * ((cmaRate || 0) / 100 / 12);
    return {
      guide,
      thisMonthResidue,
      totalExpectedSpend,
      cmaMonthlyInterest,
      cmaBalanceForInterest,
    };
  }, [
    myAccount,
    inputBudget,
    isPanicBuyMode,
    marketSignal,
    manualEdits,
    getRatios,
    ratioSum,
    cmaRate,
  ]);

  const weightChartData = useMemo(() => {
    if (!myAccount) return [];
    const { portfolio } = myAccount;
    const R = getRatios();
    return ASSET_MARKET_GROUPS.flatMap((g) =>
      g.keys.map((k) => ({
        name: NAMES[k],
        key: k,
        목표비중: Math.round((R[k] / ratioSum) * 1000) / 10,
        현재비중: Math.round((portfolio[k]?.weight ?? 0) * 100) / 100,
      }))
    );
  }, [myAccount, getRatios, ratioSum]);

  /** 리밸런싱 가이드: 자산별 목표 금액 vs 현재 금액, 차이(매수/매도 제안) */
  const rebalancingData = useMemo(() => {
    if (!myAccount) return null;
    const { portfolio, totalAsset, currentCashBalance } = myAccount;
    const R = getRatios();
    const items = ASSET_MARKET_GROUPS.flatMap((g) => g.keys).map((k) => {
      const targetWeightPct = (R[k] / ratioSum) * 100;
      const targetAmount = totalAsset * (targetWeightPct / 100);
      const currentAmount =
        k === 'cash' ? currentCashBalance : (portfolio[k]?.val ?? 0);
      const diff = targetAmount - currentAmount;
      return {
        key: k,
        name: NAMES[k],
        targetWeight: Math.round(targetWeightPct * 10) / 10,
        currentWeight: Math.round((portfolio[k]?.weight ?? 0) * 1000) / 10,
        targetAmount,
        currentAmount,
        diff,
      };
    });
    return { totalAsset, items };
  }, [myAccount, getRatios, ratioSum]);

  /** 세금 시뮬레이션 */
  const taxSimulation = useMemo(() => {
    return calculateTaxSimulation(dbHistory.records, dbHistory.dividends);
  }, [dbHistory.records, dbHistory.dividends]);

  /** MDD 계산 */
  const mddValue = useMemo(() => {
    if (!myAccount || !myAccount.chartHistory.length) return 0;
    const values = myAccount.chartHistory.map((p) => p.investment as number);
    return calculateMDD(values).mdd;
  }, [myAccount]);

  // 벤치마크 대비 수익률 비교 (실제 매수 기록 기반)
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

  useEffect(() => {
    if (!myAccount || goalToast) return;
    const roi =
      myAccount.totalInvested > 0
        ? (myAccount.totalAsset / myAccount.totalInvested - 1) * 100
        : 0;
    if (goalRoi > 0 && roi >= goalRoi) {
      setGoalToast('roi');
      localStorage.setItem(STORAGE_KEYS.goalRoiShown, String(Date.now()));
    } else if (goalAsset > 0 && myAccount.totalAsset >= goalAsset) {
      setGoalToast('asset');
      localStorage.setItem(STORAGE_KEYS.goalAssetShown, String(Date.now()));
    }
  }, [myAccount, goalRoi, goalAsset, goalToast]);

  const handleSaveToDB = async () => {
    if (!buyPlan || !myAccount) return;

    // 중복 체크
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, '0')}`;
    const existingBudget = dbHistory.budgets.find((b) =>
      b.month_date.startsWith(currentYearMonth),
    );

    let confirmMsg = `[${currentMonth}월 장부 기록]\n\n이달의 잔여 현금: ${formatNum(
      buyPlan.thisMonthResidue,
    )}원\n\n이대로 저장하시겠습니까?`;
    if (existingBudget)
      confirmMsg = `⚠️ 이미 ${currentMonth}월 기록이 있습니다.\n추가 매수로 처리하여 합산하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

    setIsSaving(true);
    const todayStr = today.toISOString().split('T')[0];

    // A. 입금액 기록 (Upsert)
    if (existingBudget) {
      await supabase
        .from('monthly_budgets')
        .update({ amount: Number(existingBudget.amount) + inputBudget })
        .eq('id', existingBudget.id);
    } else {
      await supabase
        .from('monthly_budgets')
        .insert({ month_date: todayStr, amount: inputBudget });
    }

    // B. 매수 기록 (같은 날 여러 번 저장해도 차수별로 구분해 삭제 가능하도록 batch_id·배치별 입금액 부여)
    const batchId = crypto.randomUUID();
    const records = Object.keys(buyPlan.guide).map((k) => ({
      date: todayStr,
      asset_key: k,
      price: buyPlan.guide[k].price,
      quantity: buyPlan.guide[k].qty,
      amount: buyPlan.guide[k].spent,
      is_panic_buy: isPanicBuyMode,
      batch_id: batchId,
      batch_deposit: inputBudget,
    }));
    const validRecords = records.filter((r) => r.quantity > 0);
    const batchTotalSpent = validRecords.reduce(
      (s, r) => s + Number(r.amount),
      0,
    );
    const batchRemainingCash = Math.max(
      0,
      inputBudget - batchTotalSpent,
    );
    if (validRecords.length > 0) {
      await supabase.from('investment_records').insert(validRecords);
      try {
        await supabase.from('batch_summaries').upsert(
          {
            batch_id: batchId,
            date: todayStr,
            deposit: inputBudget,
            total_spent: batchTotalSpent,
            remaining_cash: batchRemainingCash,
          },
          { onConflict: 'batch_id' },
        );
      } catch {
        // 테이블 없을 수 있음
      }
    }

    // C. 해당 날짜 기준 통장 잔고 스냅샷 저장 (CMA 이자 계산·기록용)
    const totalDepositAfter =
      dbHistory.budgets.reduce((a, b) => a + Number(b.amount ?? 0), 0) +
      inputBudget;
    const totalSpentAfter =
      dbHistory.records.reduce((a, r) => a + getRecordAmount(r), 0) +
      validRecords.reduce((a, r) => a + Number(r.amount), 0);
    const balanceAfter = Math.max(0, totalDepositAfter - totalSpentAfter);
    try {
      await supabase.from('cash_balance_snapshots').upsert(
        { date: todayStr, balance: balanceAfter },
        { onConflict: 'date' },
      );
    } catch {
      // 테이블이 없으면 무시 (Supabase에서 테이블 생성 후 사용)
    }

    toast.success('저장 완료! 장부가 갱신됩니다.');
    setManualEdits({}); // 수정사항 초기화
    loadAllData();
    setIsSaving(false);
  };

  const onConfirmPanicBuySave = async () => {
    if (panicBuyPasswordInput !== RESET_DB_PASSWORD) {
      toast.error('비밀번호가 올바르지 않습니다.');
      return;
    }
    setShowPanicBuyPasswordModal(false);
    setPanicBuyPasswordInput('');
    await handleSaveToDB();
  };

  const handleResetDB = async () => {
    setIsSaving(true);
    await supabase
      .from('investment_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase
      .from('monthly_budgets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    try {
      await supabase.from('cash_balance_snapshots').delete().neq('date', '1970-01-01');
    } catch {
      // 테이블이 없을 수 있음
    }
    try {
      await supabase.from('batch_summaries').delete().neq('batch_id', '00000000-0000-0000-0000-000000000000');
    } catch {
      // 테이블이 없을 수 있음
    }
    toast.warning('DB가 초기화되었습니다.');
    loadAllData();
    setIsSaving(false);
  };

  const onConfirmResetDB = async () => {
    if (resetPasswordInput !== RESET_DB_PASSWORD) {
      toast.error('비밀번호가 올바르지 않습니다.');
      return;
    }
    setShowResetPasswordModal(false);
    setResetPasswordInput('');
    if (!confirm('🚨 정말 DB를 초기화하시겠습니까? (복구 불가)')) return;
    await handleResetDB();
  };

  const handleExportCSV = useCallback(() => {
    const rows: string[] = [];
    rows.push('구분,날짜,항목,단가,수량,금액,비고');
    dbHistory.records.forEach((r) => {
      rows.push(
        `매수,${r.date},${NAMES[r.asset_key] ?? r.asset_key},${r.price},${
          r.quantity
        },${getRecordAmount(r)},${r.is_panic_buy ? '추매' : ''}`,
      );
    });
    rows.push('');
    rows.push('월별 입금 내역');
    rows.push('월,입금액');
    dbHistory.budgets.forEach((b) => {
      rows.push(`${b.month_date},${b.amount}`);
    });
    rows.push('');
    rows.push('현재 스냅샷');
    rows.push(`기준일,${new Date().toISOString().slice(0, 10)}`);
    if (myAccount) {
      rows.push(`총자산,${myAccount.totalAsset}`);
      rows.push(`누적원금,${myAccount.totalInvested}`);
      rows.push(
        `수익률(%),${
          myAccount.totalInvested > 0
            ? (myAccount.totalAsset / myAccount.totalInvested - 1) * 100
            : 0
        }`,
      );
    }
    const blob = new Blob(['\uFEFF' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dbHistory, myAccount]);

  const filteredRecords = useMemo(() => {
    let list = [...dbHistory.records].reverse();
    if (historyFilterMonth)
      list = list.filter((r) => r.date.startsWith(historyFilterMonth));
    if (historyFilterAsset)
      list = list.filter((r) => r.asset_key === historyFilterAsset);
    return list;
  }, [dbHistory.records, historyFilterMonth, historyFilterAsset]);

  /** 날짜+배치별로 묶은 기록 목록 (같은 날 여러 번 저장한 것을 차수별로 선택 삭제용) */
  const recordBatches = useMemo(() => {
    const map = new Map<string, { date: string; batchId: string | null; count: number }>();
    dbHistory.records.forEach((r) => {
      const rec = r as { date?: string; batch_id?: string | null };
      const d = rec.date ? rec.date.substring(0, 10) : '';
      if (!d) return;
      const bid = rec.batch_id ?? null;
      const key = `${d}|${bid ?? 'null'}`;
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { date: d, batchId: bid, count: 1 });
    });
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => {
        const c = b.date.localeCompare(a.date);
        if (c !== 0) return c;
        return (a.batchId ?? '').localeCompare(b.batchId ?? '');
      });
  }, [dbHistory.records]);

  const handleToggleDeleteBatch = useCallback((key: string) => {
    setDeleteByDateSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const handleDeleteByDateConfirm = useCallback(async () => {
    if (deleteByDatePassword !== RESET_DB_PASSWORD) {
      toast.error('비밀번호가 올바르지 않습니다.');
      return;
    }
    if (deleteByDateSelected.length === 0) return;
    setIsDeletingByDate(true);
    try {
      // 월별로 빼야 할 입금 합계 = 회차별 총 기록액(deposit). batch_summaries에 있으면 사용, 없으면 batch_deposit 또는 매수합으로 대체
      const subtractByMonth: Record<string, number> = {};
      for (const key of deleteByDateSelected) {
        const [date, batchIdPart] = key.split('|');
        const batchId = batchIdPart === 'null' ? null : batchIdPart;
        const yearMonth = date.substring(0, 7);
        const batchRecords = dbHistory.records.filter((r) => {
          const rec = r as { date?: string; batch_id?: string | null };
          const d = rec.date?.substring(0, 10);
          const bid = rec.batch_id ?? null;
          return d === date && (batchId === null ? bid == null : bid === batchId);
        });
        let batchDeposit = 0;
        if (batchId != null) {
          const summary = dbHistory.batchSummaries.find(
            (s) => s.batch_id === batchId,
          );
          if (summary && summary.deposit > 0) {
            batchDeposit = summary.deposit;
          }
        }
        if (batchDeposit <= 0 && batchRecords.length > 0) {
          const firstRec = batchRecords[0] as { batch_deposit?: number | null; amount?: number } | undefined;
          if (firstRec != null && Number(firstRec.batch_deposit) > 0) {
            batchDeposit = Number(firstRec.batch_deposit);
          } else {
            batchDeposit = batchRecords.reduce(
              (sum, r) => sum + getRecordAmount(r as { amount?: number; amount_override?: number | null }),
              0,
            );
          }
        }
        if (batchDeposit > 0) {
          subtractByMonth[yearMonth] =
            (subtractByMonth[yearMonth] ?? 0) + batchDeposit;
        }
      }
      for (const [yearMonth, totalToSubtract] of Object.entries(
        subtractByMonth,
      )) {
        if (totalToSubtract <= 0) continue;
        const monthRows = dbHistory.budgets.filter((b) =>
          (b.month_date || '').toString().startsWith(yearMonth),
        );
        if (monthRows.length === 0) continue;
        const currentTotal = monthRows.reduce(
          (s, b) => s + Number(b.amount ?? 0),
          0,
        );
        const newAmount = Math.max(0, currentTotal - totalToSubtract);
        await supabase
          .from('monthly_budgets')
          .update({ amount: newAmount })
          .eq('id', monthRows[0].id);
        for (let i = 1; i < monthRows.length; i++) {
          await supabase
            .from('monthly_budgets')
            .update({ amount: 0 })
            .eq('id', monthRows[i].id);
        }
      }
      for (const key of deleteByDateSelected) {
        const [date, batchIdPart] = key.split('|');
        const batchId = batchIdPart === 'null' ? null : batchIdPart;
        if (batchId === null) {
          await supabase
            .from('investment_records')
            .delete()
            .eq('date', date)
            .is('batch_id', null);
        } else {
          await supabase
            .from('investment_records')
            .delete()
            .eq('date', date)
            .eq('batch_id', batchId);
          try {
            await supabase
              .from('batch_summaries')
              .delete()
              .eq('batch_id', batchId);
          } catch {
            // 테이블 없을 수 있음
          }
        }
      }
      await loadAllData();
      toast.success(`선택한 ${deleteByDateSelected.length}개 기록이 삭제되었습니다.`);
      setShowDeleteByDateModal(false);
      setDeleteByDateSelected([]);
      setDeleteByDatePassword('');
    } finally {
      setIsDeletingByDate(false);
    }
  }, [
    deleteByDatePassword,
    deleteByDateSelected,
    dbHistory.records,
    dbHistory.budgets,
    dbHistory.batchSummaries,
    loadAllData,
  ]);

  if (loading || !myAccount || !buyPlan) return <LoadingScreen />;

  const {
    currentCashBalance,
    portfolio,
    totalAsset,
    totalInvested,
    isCrash,
    chartHistory,
    currentExchangeRate,
    currentPriceMap: rawCurrentPriceMap,
  } = myAccount;
  const currentPriceMap: Record<string, number> = Object.fromEntries(
    Object.entries(rawCurrentPriceMap).map(([k, v]) => [k, Number(v) || 0]),
  );
  const { guide, thisMonthResidue, totalExpectedSpend } = buyPlan;
  const totalRoi =
    totalInvested > 0 ? (totalAsset / totalInvested - 1) * 100 : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8 text-[var(--foreground)] font-sans transition-colors flex justify-center">
      <ToastContainer />
      <div className="w-full max-w-6xl space-y-6">
        <GoalToastBar
          goalToast={goalToast}
          goalRoi={goalRoi}
          goalAsset={goalAsset}
          formatNum={formatNum}
          onClose={() => setGoalToast(null)}
        />

        {/* 투자 규칙 (IPS) — 감정 방어 */}
        <InvestmentPolicySection />

        {/* 연속 적립 스트릭 */}
        <InvestmentStreakSection budgets={dbHistory.budgets} />

        {/* 감정 일기 */}
        <EmotionJournalSection
          totalAsset={totalAsset}
          formatNum={formatNum}
        />

        {isCrash && !isPanicBuyMode && (
          <PanicBuyBanner onEnterPanicMode={() => setIsPanicBuyMode(true)} />
        )}

        {/* 시그널 높음 + 이번 달 미매수 경고 */}
        {!signalAlertDismissed && (
          <SignalAlertBanner
            signal={marketSignal}
            thisMonthHasBuy={dbHistory.records.some(
              (r) => r.date.substring(0, 7) === new Date().toISOString().slice(0, 7),
            )}
            isPanicBuyMode={isPanicBuyMode}
            onDismiss={() => setSignalAlertDismissed(true)}
          />
        )}

        {/* 매수 시그널 대시보드 */}
        {marketSignal && (
          <MarketSignalSection
            signal={marketSignal}
            names={NAMES}
            onRefresh={loadAllData}
            isRefreshing={isRefreshingPrice}
            indices={marketIndices}
          />
        )}

        <header className="flex flex-col justify-between items-start gap-4">
          <HeaderSection
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onExportCSV={handleExportCSV}
            onOpenSettings={() => setShowSettings(true)}
            onRefreshPrices={loadAllData}
            isRefreshingPrice={isRefreshingPrice}
            onOpenResetDb={() => setShowResetPasswordModal(true)}
            onOpenDeleteByDate={() => setShowDeleteByDateModal(true)}
            onOpenSellRecord={() => setShowSellModal(true)}
            totalInvested={totalInvested}
            totalAsset={totalAsset}
            totalRoi={totalRoi}
            hideReturns={hideReturns}
            onToggleHideReturns={() => setHideReturns(!hideReturns)}
          />
        </header>

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
          isPanicBuyMode={isPanicBuyMode}
          setIsPanicBuyMode={setIsPanicBuyMode}
          formatNum={formatNum}
        />

        <BuyGuideSection
          currentMonth={currentMonth}
          isPanicBuyMode={isPanicBuyMode}
          onSaveClick={() => setShowPanicBuyPasswordModal(true)}
          isSaving={isSaving}
          dbHistoryBudgets={dbHistory.budgets}
          guide={guide}
          names={NAMES}
          assetGroups={ASSET_MARKET_GROUPS}
          manualEdits={manualEdits}
          setManualEdits={setManualEdits}
          thisMonthResidue={thisMonthResidue}
          formatNum={formatNum}
          marketSignal={marketSignal}
        />

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

        {/* 익절 가이드 (비중 초과 + ROI 50%↑) */}
        <ProfitTakingGuideSection
          portfolio={portfolio}
          targetRatios={getRatios()}
          currentPriceMap={currentPriceMap}
          names={NAMES}
          totalAsset={totalAsset}
          formatNum={formatNum}
        />

        {/* 명목 vs 실질 수익률 */}
        <RealReturnSection
          totalAsset={totalAsset}
          totalInvested={totalInvested}
          totalDividends={myAccount.totalDividends ?? 0}
          cumulativeCmaInterest={myAccount.cumulativeCmaInterestToToday ?? 0}
          oldestDepositDate={
            dbHistory.budgets[0]?.month_date ?? new Date().toISOString().slice(0, 10)
          }
          formatNum={formatNum}
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
                date: new Date().toISOString().slice(0, 10),
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

        {/* "만약 그때 매도했다면?" 시뮬레이터 — 감정 매도 학습 */}
        <WhatIfSection
          records={dbHistory.records}
          marketHistory={fullMarketHistory}
          livePrices={livePrices}
          totalAsset={totalAsset}
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
          onSaveAmountOverride={saveBtcAmountOverride}
        />

        <DepositsHistorySection
          open={showDeposits}
          onToggle={() => setShowDeposits(!showDeposits)}
          budgets={dbHistory.budgets}
          formatNum={formatNum}
        />

        {/* 배당금 내역 */}
        <DividendSection
          dividends={dbHistory.dividends}
          names={NAMES}
          formatNum={formatNum}
          onAddDividend={handleAddDividend}
          onDeleteDividend={handleDeleteDividend}
        />

        {/* 세금 시뮬레이션 */}
        <TaxSimulationSection
          taxData={taxSimulation}
          formatNum={formatNum}
          currentYear={new Date().getFullYear()}
        />

        {/* Tax-Loss Harvesting 알림 */}
        <TaxLossHarvestingSection
          records={dbHistory.records}
          portfolio={portfolio}
          currentPriceMap={currentPriceMap}
          names={NAMES}
          formatNum={formatNum}
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

        {/* 데이터 무결성 점검 */}
        <DataIntegritySection
          records={dbHistory.records}
          batchSummaries={dbHistory.batchSummaries}
          budgets={dbHistory.budgets}
          formatNum={formatNum}
        />

        {/* 매도 기록 모달 */}
        <SellRecordModal
          open={showSellModal}
          onClose={() => setShowSellModal(false)}
          portfolio={portfolio}
          names={NAMES}
          currentPriceMap={currentPriceMap}
          formatNum={formatNum}
          formatDec={formatDec}
          onSave={handleSellRecord}
          isSaving={isSaving}
        />

        <PasswordConfirmModal
          open={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false);
            setResetPasswordInput('');
          }}
          passwordValue={resetPasswordInput}
          onPasswordChange={setResetPasswordInput}
          onConfirm={onConfirmResetDB}
          isSaving={isSaving}
          variant="reset-db"
        />

        <PasswordConfirmModal
          open={showPanicBuyPasswordModal}
          onClose={() => {
            setShowPanicBuyPasswordModal(false);
            setPanicBuyPasswordInput('');
          }}
          passwordValue={panicBuyPasswordInput}
          onPasswordChange={setPanicBuyPasswordInput}
          onConfirm={onConfirmPanicBuySave}
          isSaving={isSaving}
          variant="panic-save"
        />

        <DeleteByDateModal
          open={showDeleteByDateModal}
          onClose={() => {
            setShowDeleteByDateModal(false);
            setDeleteByDateSelected([]);
            setDeleteByDatePassword('');
          }}
          recordBatches={recordBatches}
          selectedKeys={deleteByDateSelected}
          onToggleBatch={handleToggleDeleteBatch}
          passwordValue={deleteByDatePassword}
          onPasswordChange={setDeleteByDatePassword}
          onConfirm={handleDeleteByDateConfirm}
          isDeleting={isDeletingByDate}
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
          saveEmergencyFundToDb={saveEmergencyFundToDb}
        />
      </div>
    </div>
  );
}
