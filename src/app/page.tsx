'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { HeaderSection } from './components/HeaderSection';
import { HoldingsSummarySection } from './components/HoldingsSummarySection';
import { GoalSection } from './components/GoalSection';
import { MonthlyOverviewSection } from './components/MonthlyOverviewSection';
import { BuyGuideSection } from './components/BuyGuideSection';
import { WeightChartSection } from './components/WeightChartSection';
import { AssetGrowthSection } from './components/AssetGrowthSection';
import { HoldingsDetailSection } from './components/HoldingsDetailSection';
import { InvestmentHistorySection } from './components/InvestmentHistorySection';
import { DepositsHistorySection } from './components/DepositsHistorySection';
import { PanicBuyBanner } from './components/PanicBuyBanner';
import { PasswordConfirmModal } from './components/PasswordConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { GoalToastBar } from './components/GoalToastBar';
import { LoadingScreen } from './components/LoadingScreen';

const STORAGE_KEYS = {
  dark: 'asset-tracker-dark',
  ratios: 'asset-tracker-ratios',
  budget: 'asset-tracker-budget',
  goalRoi: 'asset-tracker-goal-roi',
  goalAsset: 'asset-tracker-goal-asset',
  goalRoiShown: 'asset-tracker-goal-roi-shown',
  goalAssetShown: 'asset-tracker-goal-asset-shown',
  cmaRate: 'asset-tracker-cma-rate',
};

const COLORS = [
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#f59e0b',
  '#94a3b8',
  '#10b981',
  '#f43f5e',
];
const NAMES: Record<string, string> = {
  tech10: '테크TOP10',
  nasdaq: '나스닥100',
  snp: 'S&P500',
  gold: '금은선물(H)',
  cash: '현금(CMA)',
  btc: '비트코인',
};
// 테크TOP10 3, 나스닥 3, S&P 3, 금은·현금·비트코인 각 1 (합 12)
const DEFAULT_RATIOS: Record<string, number> = {
  tech10: 3,
  nasdaq: 3,
  snp: 3,
  gold: 1,
  cash: 1,
  btc: 1,
};
/** DB 초기화 시 필요한 비밀번호 (일단 하드코딩) */
const RESET_DB_PASSWORD = '134679';

export default function RealDbTower() {
  const [inputBudget, setInputBudget] = useState(() =>
    typeof window === 'undefined'
      ? 1300000
      : Number(localStorage.getItem(STORAGE_KEYS.budget)) || 1300000,
  );
  const [marketData, setMarketData] = useState<any[]>([]);
  const [livePrices, setLivePrices] = useState<any | null>(null);
  const [dbHistory, setDbHistory] = useState<{
    budgets: any[];
    records: any[];
  }>({ budgets: [], records: [] });
  const [loading, setLoading] = useState(true);
  const [isPanicBuyMode, setIsPanicBuyMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [manualEdits, setManualEdits] = useState<Record<string, number>>({});
  const [darkMode, setDarkMode] = useState(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem(STORAGE_KEYS.dark) === 'true',
  );
  const [customRatios, setCustomRatios] = useState<Record<
    string,
    number
  > | null>(null);
  const [goalRoi, setGoalRoi] = useState<number>(() => {
    if (typeof window === 'undefined') return 7;
    const v = localStorage.getItem(STORAGE_KEYS.goalRoi);
    return v ? Number(v) : 7;
  });
  const [goalAsset, setGoalAsset] = useState<number>(() => {
    if (typeof window === 'undefined') return 100000000;
    const v = localStorage.getItem(STORAGE_KEYS.goalAsset);
    return v ? Number(v) : 100000000;
  });
  const [goalToast, setGoalToast] = useState<'roi' | 'asset' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [historyFilterMonth, setHistoryFilterMonth] = useState<string>('');
  const [historyFilterAsset, setHistoryFilterAsset] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showDeposits, setShowDeposits] = useState(false);
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
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
  const [cmaRate, setCmaRate] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.95;
    const v = localStorage.getItem(STORAGE_KEYS.cmaRate);
    return v ? Number(v) : 1.95;
  });

  const getRatios = useCallback((): Record<string, number> => {
    return customRatios ?? DEFAULT_RATIOS;
  }, [customRatios]);

  const ratioSum = useMemo(() => {
    const r = getRatios();
    return Object.values(r).reduce((a, b) => a + b, 0);
  }, [getRatios]);

  const loadAllData = async () => {
    setIsRefreshingPrice(true);
    try {
      const res = await fetch('/api/market');
      const payload = await res.json();

      if (Array.isArray(payload)) {
        setMarketData(payload.filter((d) => d.d >= '2025-01'));
        setLivePrices(payload[payload.length - 1] || null);
      } else {
        const { history, latest } = payload;
        if (Array.isArray(history))
          setMarketData(history.filter((d: any) => d.d >= '2025-01'));
        setLivePrices(latest || null);
      }
      const { data: bData } = await supabase
        .from('monthly_budgets')
        .select('*')
        .order('month_date', { ascending: true });
      const { data: rData } = await supabase
        .from('investment_records')
        .select('*')
        .order('date', { ascending: true });
      setDbHistory({ budgets: bData || [], records: rData || [] });
    } finally {
      setLoading(false);
      setIsRefreshingPrice(false);
    }
  };

  useEffect(() => {
    loadAllData();
    setCurrentMonth(new Date().getMonth() + 1);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(STORAGE_KEYS.dark, String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.ratios);
    if (raw)
      try {
        setCustomRatios(JSON.parse(raw));
      } catch {
        /* ignore */
      }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.budget);
    if (!raw) return;
    const v = Number(raw);
    if (Number.isFinite(v) && v > 0) setInputBudget(v);
  }, []);

  useEffect(() => {
    if (Number.isFinite(inputBudget) && inputBudget > 0)
      localStorage.setItem(STORAGE_KEYS.budget, String(inputBudget));
  }, [inputBudget]);

  useEffect(() => {
    if (Number.isFinite(cmaRate) && cmaRate >= 0)
      localStorage.setItem(STORAGE_KEYS.cmaRate, String(cmaRate));
  }, [cmaRate]);

  const saveCustomRatios = useCallback(
    (ratios: Record<string, number> | null) => {
      setCustomRatios(ratios);
      if (ratios)
        localStorage.setItem(STORAGE_KEYS.ratios, JSON.stringify(ratios));
      else localStorage.removeItem(STORAGE_KEYS.ratios);
    },
    [],
  );

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
    const totalSpent = dbHistory.records.reduce(
      (acc, cur) => acc + Number(cur.amount),
      0,
    );
    const currentCashBalance = totalDeposit - totalSpent;

    const portfolio: any = {};
    Object.keys(NAMES).forEach(
      (k) =>
        (portfolio[k] = { qty: 0, cost: 0, avg: 0, val: 0, roi: 0, weight: 0 }),
    );

    dbHistory.records.forEach((r) => {
      if (portfolio[r.asset_key]) {
        portfolio[r.asset_key].qty += Number(r.quantity);
        portfolio[r.asset_key].cost += Number(r.amount);
      }
    });

    let totalStockValue = 0;
    Object.keys(portfolio).forEach((k) => {
      if (k === 'cash') return;
      const curP = currentPriceMap[k] || 0;
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

    // 차트 데이터 (DB기반 역추적) — 과거는 월별 시세, 마지막은 실시간 시세 반영
    const chartHistoryRaw = marketData.map((mPoint) => {
      const date = mPoint.d;
      const depositUntilNow = dbHistory.budgets
        .filter((b) => b.month_date.substring(0, 7) <= date)
        .reduce((acc, cur) => acc + Number(cur.amount), 0);
      const recordsUntilNow = dbHistory.records.filter(
        (r) => r.date.substring(0, 7) <= date,
      );
      const spentUntilNow = recordsUntilNow.reduce(
        (acc, cur) => acc + Number(cur.amount),
        0,
      );
      const cashUntilNow = depositUntilNow - spentUntilNow;

      // 종목별 원금/시세 추적
      let stockValUntilNow = 0;
      const perAsset: Record<string, { principal: number; value: number }> = {};
      Object.keys(NAMES).forEach((k) => {
        if (k === 'cash') return;
        const assetRecords = recordsUntilNow.filter((r) => r.asset_key === k);
        const qty = assetRecords.reduce(
          (acc, cur) => acc + Number(cur.quantity),
          0,
        );
        const cost = assetRecords.reduce(
          (acc, cur) => acc + Number(cur.amount),
          0,
        );
        const value = qty * (mPoint[k] || 0);
        perAsset[k] = { principal: cost, value };
        stockValUntilNow += value;
      });

      const base: any = {
        date,
        principal: depositUntilNow,
        investment: stockValUntilNow + cashUntilNow,
      };

      // chartHistory 에 종목별 데이터도 함께 포함
      Object.keys(perAsset).forEach((k) => {
        base[`principal_${k}`] = perAsset[k].principal;
        base[`value_${k}`] = perAsset[k].value;
      });

      return base;
    });

    // 마지막 시점: 실시간 시세(livePrices)가 있으면 총자산만 현재 시세 기준으로 덮어씀
    const chartHistory =
      chartHistoryRaw.length === 0
        ? chartHistoryRaw
        : livePrices
          ? chartHistoryRaw.slice(0, -1).concat({
              ...chartHistoryRaw[chartHistoryRaw.length - 1],
              investment: totalStockValue + currentCashBalance,
            })
          : chartHistoryRaw;

    const isCrash = Object.keys(NAMES).some(
      (k) =>
        k !== 'cash' &&
        k !== 'btc' &&
        (currentPriceMap[k] / prevPriceMap[k] - 1) * 100 <= -10,
    );
    const currentExchangeRate = currentPriceMap.ex ?? 1350;

    return {
      currentCashBalance,
      portfolio,
      currentPriceMap,
      prevPriceMap,
      totalStockValue,
      totalAsset: totalStockValue + currentCashBalance,
      totalInvested: totalDeposit,
      isCrash,
      chartHistory,
      currentExchangeRate,
    };
  }, [marketData, dbHistory, livePrices]);

  // 2. 매수 가이드 계산 (핵심 로직)
  const buyPlan = useMemo(() => {
    if (!myAccount) return null;
    const { currentCashBalance, currentPriceMap, prevPriceMap, portfolio } =
      myAccount;
    const RATIOS = getRatios();

    const guide: any = {};
    let totalMonthlySpend = 0;
    let totalExpectedSpend = 0;

    const assetKeys = Object.keys(RATIOS).filter((k) => k !== 'cash');

    // 추매 예산 계산: 보유 현금 + 이번 달 잔여 예산의 90%
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
    const dropByKey: Record<string, number> = {};
    assetKeys.forEach((k) => {
      const prevP = prevPriceMap[k] || 1;
      dropByKey[k] = (currentPriceMap[k] / prevP - 1) * 100;
    });
    const droppedAssets = assetKeys.filter((k) => dropByKey[k] <= -10);
    const halfRatioSum = assetKeys.reduce((s, k) => s + RATIOS[k] / 2, 0);
    const totalDropWeight =
      droppedAssets.length > 0
        ? droppedAssets.reduce((s, k) => s + Math.abs(dropByKey[k]), 0)
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
      }

      // 3. 수동 수정 반영 (Manual Override)
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
      const monthlySpendContribution = isPanicBuyMode
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
      };
    });

    const thisMonthResidue = isPanicBuyMode
      ? inputBudget + myAccount.currentCashBalance - totalMonthlySpend
      : inputBudget - totalMonthlySpend;
    // CMA 월 예상 이자: 이달 잔여 현금 + 현재 통장 잔고(기존에 매수 후 남은 현금) 모두 CMA에 있음
    const cmaBalanceForInterest = isPanicBuyMode
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
    manualEdits,
    getRatios,
    ratioSum,
    cmaRate,
  ]);

  const weightChartData = useMemo(() => {
    if (!myAccount) return [];
    const { portfolio, totalAsset } = myAccount;
    const R = getRatios();
    return Object.keys(NAMES).map((k) => ({
      name: NAMES[k],
      key: k,
      목표비중: Math.round((R[k] / ratioSum) * 1000) / 10,
      현재비중: Math.round(portfolio[k].weight * 100) / 100,
    }));
  }, [myAccount, getRatios, ratioSum]);

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

    // B. 매수 기록
    const records = Object.keys(buyPlan.guide).map((k) => ({
      date: todayStr,
      asset_key: k,
      price: buyPlan.guide[k].price,
      quantity: buyPlan.guide[k].qty,
      amount: buyPlan.guide[k].spent,
      is_panic_buy: isPanicBuyMode,
    }));
    const validRecords = records.filter((r) => r.quantity > 0);
    if (validRecords.length > 0)
      await supabase.from('investment_records').insert(validRecords);

    alert('✅ 저장 완료! 장부가 갱신됩니다.');
    setManualEdits({}); // 수정사항 초기화
    loadAllData();
    setIsSaving(false);
  };

  const onConfirmPanicBuySave = async () => {
    if (panicBuyPasswordInput !== RESET_DB_PASSWORD) {
      alert('비밀번호가 올바르지 않습니다.');
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
    alert('초기화됨');
    loadAllData();
    setIsSaving(false);
  };

  const onConfirmResetDB = async () => {
    if (resetPasswordInput !== RESET_DB_PASSWORD) {
      alert('비밀번호가 올바르지 않습니다.');
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
        },${r.amount},${r.is_panic_buy ? '추매' : ''}`,
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

  if (loading || !myAccount || !buyPlan) return <LoadingScreen />;

  const {
    currentCashBalance,
    portfolio,
    totalAsset,
    totalInvested,
    isCrash,
    chartHistory,
    currentExchangeRate,
    currentPriceMap,
  } = myAccount;
  const {
    guide,
    thisMonthResidue,
    totalExpectedSpend,
    cmaMonthlyInterest,
    cmaBalanceForInterest,
  } = buyPlan;
  const formatNum = (n: number) => Math.floor(n).toLocaleString();
  const formatDec = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  const totalRoi =
    totalInvested > 0 ? (totalAsset / totalInvested - 1) * 100 : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8 text-[var(--foreground)] font-sans transition-colors flex justify-center">
      <div className="w-full max-w-6xl space-y-6">
        <GoalToastBar
          goalToast={goalToast}
          goalRoi={goalRoi}
          goalAsset={goalAsset}
          formatNum={formatNum}
          onClose={() => setGoalToast(null)}
        />
        {isCrash && !isPanicBuyMode && (
          <PanicBuyBanner onEnterPanicMode={() => setIsPanicBuyMode(true)} />
        )}

        <header className="flex flex-col justify-between items-start gap-4">
          <HeaderSection
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((d) => !d)}
            onExportCSV={handleExportCSV}
            onOpenSettings={() => setShowSettings(true)}
            onRefreshPrices={loadAllData}
            isRefreshingPrice={isRefreshingPrice}
            onOpenResetDb={() => setShowResetPasswordModal(true)}
            totalInvested={totalInvested}
            totalAsset={totalAsset}
            totalRoi={totalRoi}
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
          manualEdits={manualEdits}
          setManualEdits={setManualEdits}
          thisMonthResidue={thisMonthResidue}
          cmaMonthlyInterest={cmaMonthlyInterest}
          cmaBalanceForInterest={cmaBalanceForInterest}
          cmaRate={cmaRate}
          formatNum={formatNum}
        />

        {/* 현재 보유 수량 / 평단 요약 */}
        <HoldingsSummarySection
          portfolio={portfolio}
          names={NAMES}
          colors={COLORS}
          formatNum={formatNum}
          formatDec={formatDec}
          currentPriceMap={currentPriceMap}
        />

        <WeightChartSection
          weightChartData={weightChartData}
          darkMode={darkMode}
        />

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
        />

        <DepositsHistorySection
          open={showDeposits}
          onToggle={() => setShowDeposits(!showDeposits)}
          budgets={dbHistory.budgets}
          formatNum={formatNum}
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

        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          inputBudget={inputBudget}
          setInputBudget={setInputBudget}
          customRatios={customRatios}
          setCustomRatios={setCustomRatios}
          names={NAMES}
          defaultRatios={DEFAULT_RATIOS}
          storageKeyRatios={STORAGE_KEYS.ratios}
          onResetToDefault={() => saveCustomRatios(null)}
          cmaRate={cmaRate}
          setCmaRate={setCmaRate}
          storageKeyCmaRate={STORAGE_KEYS.cmaRate}
        />
      </div>
    </div>
  );
}
