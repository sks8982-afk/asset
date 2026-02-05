'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Calculator,
  Wallet,
  RefreshCcw,
  ArrowDownCircle,
  Save,
  AlertTriangle,
  Layers,
  Trash2,
  Edit3,
  History,
  Download,
  Moon,
  Sun,
  Settings,
  Target,
  Banknote,
  ChevronDown,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const STORAGE_KEYS = {
  dark: 'asset-tracker-dark',
  ratios: 'asset-tracker-ratios',
  budget: 'asset-tracker-budget',
  goalRoi: 'asset-tracker-goal-roi',
  goalAsset: 'asset-tracker-goal-asset',
  goalRoiShown: 'asset-tracker-goal-roi-shown',
  goalAssetShown: 'asset-tracker-goal-asset-shown',
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

export default function RealDbTower() {
  const [inputBudget, setInputBudget] = useState(() =>
    typeof window === 'undefined'
      ? 1300000
      : Number(localStorage.getItem(STORAGE_KEYS.budget)) || 1300000
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
    new Date().getMonth() + 1
  );
  const [manualEdits, setManualEdits] = useState<Record<string, number>>({});
  const [darkMode, setDarkMode] = useState(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem(STORAGE_KEYS.dark) === 'true'
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

  const saveCustomRatios = useCallback(
    (ratios: Record<string, number> | null) => {
      setCustomRatios(ratios);
      if (ratios)
        localStorage.setItem(STORAGE_KEYS.ratios, JSON.stringify(ratios));
      else localStorage.removeItem(STORAGE_KEYS.ratios);
    },
    []
  );

  // 1. 내 자산 현황 분석 (DB 기준)
  const myAccount = useMemo(() => {
    if (!marketData.length) return null;
    const lastHistoryPoint = marketData[marketData.length - 1];
    const currentPriceMap = livePrices || lastHistoryPoint;
    const prevPriceMap = marketData[marketData.length - 2] || lastHistoryPoint;

    const totalDeposit = dbHistory.budgets.reduce(
      (acc, cur) => acc + Number(cur.amount),
      0
    );
    const totalSpent = dbHistory.records.reduce(
      (acc, cur) => acc + Number(cur.amount),
      0
    );
    const currentCashBalance = totalDeposit - totalSpent;

    const portfolio: any = {};
    Object.keys(NAMES).forEach(
      (k) =>
        (portfolio[k] = { qty: 0, cost: 0, avg: 0, val: 0, roi: 0, weight: 0 })
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

    // 차트 데이터 (DB기반 역추적)
    const chartHistory = marketData.map((mPoint) => {
      const date = mPoint.d;
      const depositUntilNow = dbHistory.budgets
        .filter((b) => b.month_date.substring(0, 7) <= date)
        .reduce((acc, cur) => acc + Number(cur.amount), 0);
      const recordsUntilNow = dbHistory.records.filter(
        (r) => r.date.substring(0, 7) <= date
      );
      const spentUntilNow = recordsUntilNow.reduce(
        (acc, cur) => acc + Number(cur.amount),
        0
      );
      const cashUntilNow = depositUntilNow - spentUntilNow;
      let stockValUntilNow = 0;
      Object.keys(NAMES).forEach((k) => {
        if (k === 'cash') return;
        const qty = recordsUntilNow
          .filter((r) => r.asset_key === k)
          .reduce((acc, cur) => acc + Number(cur.quantity), 0);
        stockValUntilNow += qty * (mPoint[k] || 0);
      });
      return {
        date,
        principal: depositUntilNow,
        investment: stockValUntilNow + cashUntilNow,
      };
    });

    const isCrash = Object.keys(NAMES).some(
      (k) =>
        k !== 'cash' &&
        k !== 'btc' &&
        (currentPriceMap[k] / prevPriceMap[k] - 1) * 100 <= -10
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

    let panicBudget = 0;
    if (isPanicBuyMode) {
      panicBudget = currentCashBalance * 0.9;
    }

    const guide: any = {};
    let totalMonthlySpend = 0;
    let totalExpectedSpend = 0;

    const assetKeys = Object.keys(RATIOS).filter((k) => k !== 'cash');
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
      const monthlySpendContribution =
        manualEdits[k] !== undefined ? spent : actualBaseSpent;
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

    const thisMonthResidue = inputBudget - totalMonthlySpend;
    return { guide, thisMonthResidue, totalExpectedSpend };
  }, [
    myAccount,
    inputBudget,
    isPanicBuyMode,
    manualEdits,
    getRatios,
    ratioSum,
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
      today.getMonth() + 1
    ).padStart(2, '0')}`;
    const existingBudget = dbHistory.budgets.find((b) =>
      b.month_date.startsWith(currentYearMonth)
    );

    let confirmMsg = `[${currentMonth}월 장부 기록]\n\n이달의 잔여 현금: ${formatNum(
      buyPlan.thisMonthResidue
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

  const handleResetDB = async () => {
    if (!confirm('🚨 초기화하시겠습니까? (복구 불가)')) return;
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

  const handleExportCSV = useCallback(() => {
    const rows: string[] = [];
    rows.push('구분,날짜,항목,단가,수량,금액,비고');
    dbHistory.records.forEach((r) => {
      rows.push(
        `매수,${r.date},${NAMES[r.asset_key] ?? r.asset_key},${r.price},${
          r.quantity
        },${r.amount},${r.is_panic_buy ? '추매' : ''}`
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
        }`
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

  if (loading || !myAccount || !buyPlan)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] font-black text-slate-400">
        <RefreshCcw className="animate-spin mb-4" size={48} />
        <p className="tracking-widest uppercase italic text-center">
          장부 불러오는 중...
        </p>
      </div>
    );

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
  const { guide, thisMonthResidue, totalExpectedSpend } = buyPlan;
  const formatNum = (n: number) => Math.floor(n).toLocaleString();
  const formatDec = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  const totalRoi =
    totalInvested > 0 ? (totalAsset / totalInvested - 1) * 100 : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8 text-[var(--foreground)] font-sans transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {goalToast && (
          <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target size={24} />
              <p className="font-black">
                {goalToast === 'roi' && `🎉 목표 수익률 ${goalRoi}% 도달!`}
                {goalToast === 'asset' &&
                  `🎉 목표 자산 ${formatNum(goalAsset)}원 도달!`}
              </p>
            </div>
            <button
              onClick={() => setGoalToast(null)}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm font-bold"
            >
              닫기
            </button>
          </div>
        )}
        {isCrash && !isPanicBuyMode && (
          <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl animate-bounce flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} />
              <p className="font-black">
                ⚠️ 하락장 감지! 보유 현금을 투입할 때입니다.
              </p>
            </div>
            <button
              onClick={() => setIsPanicBuyMode(true)}
              className="bg-white text-rose-600 px-4 py-2 rounded-xl font-black text-sm"
            >
              추매 모드 ON
            </button>
          </div>
        )}

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest italic">
                Real-Time DB Ledger
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none tracking-tighter">
              실전{' '}
              <span className="text-blue-600 dark:text-blue-400">
                투자 장부
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              title={darkMode ? '라이트 모드' : '다크 모드'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={handleExportCSV}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
              title="CSV 내보내기"
            >
              <Download size={18} />
              <span className="text-xs font-bold hidden sm:inline">
                내보내기
              </span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              title="설정"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={loadAllData}
              disabled={isRefreshingPrice}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-60"
              title="시세 새로고침"
            >
              <RefreshCcw
                size={18}
                className={isRefreshingPrice ? 'animate-spin' : ''}
              />
              <span className="text-xs font-bold hidden sm:inline">
                시세 새로고침
              </span>
            </button>
            <button
              onClick={handleResetDB}
              className="bg-white dark:bg-slate-800 text-slate-400 p-4 rounded-3xl border border-slate-200 dark:border-slate-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 hover:border-rose-200 transition-all flex flex-col items-center justify-center gap-1"
            >
              <Trash2 size={18} />
              <span className="text-[9px] font-black uppercase">DB 초기화</span>
            </button>
            <div className="bg-slate-900 dark:bg-slate-800 px-6 py-4 rounded-3xl text-white shadow-2xl flex gap-6 border-b-4 border-blue-600">
              <div className="text-right border-r border-white/10 pr-6">
                <p className="text-[10px] font-bold opacity-50 uppercase mb-1">
                  순자산 총액
                </p>
                <p className="text-2xl font-black italic">
                  {formatNum(totalAsset)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold opacity-50 uppercase mb-1">
                  실현 수익률
                </p>
                <p
                  className={`text-2xl font-black ${
                    totalRoi >= 0 ? 'text-blue-400' : 'text-rose-400'
                  }`}
                >
                  {totalRoi > 0 ? '+' : ''}
                  {totalRoi.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* 목표 설정 */}
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Target size={14} /> 목표
          </span>
          <label className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              수익률
            </span>
            <input
              type="number"
              value={goalRoi}
              onChange={(e) => setGoalRoi(Number(e.target.value) || 0)}
              onBlur={() =>
                localStorage.setItem(STORAGE_KEYS.goalRoi, String(goalRoi))
              }
              className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
            />
            <span className="text-xs text-slate-500">%</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              자산
            </span>
            <input
              type="text"
              value={goalAsset.toLocaleString()}
              onChange={(e) =>
                setGoalAsset(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)
              }
              onBlur={() =>
                localStorage.setItem(STORAGE_KEYS.goalAsset, String(goalAsset))
              }
              className="w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
            />
            <span className="text-xs text-slate-500">원</span>
          </label>
        </div>

        {/* 1. 입력 & 현황판 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-600 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                  {dbHistory.budgets.some((b) =>
                    b.month_date.startsWith(
                      new Date().toISOString().slice(0, 7)
                    )
                  )
                    ? '이번 달 추가 입금액'
                    : '이번 달 투자 원금'}
                </p>
                <input
                  type="text"
                  value={inputBudget.toLocaleString()}
                  onChange={(e) =>
                    setInputBudget(
                      Number(e.target.value.replace(/[^0-9]/g, ''))
                    )
                  }
                  className="bg-transparent border-none p-0 font-black text-2xl text-blue-600 dark:text-blue-400 focus:ring-0 w-40 outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span title="적용 환율">
                    환율 1USD = {formatNum(currentExchangeRate)}원
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    이번 달 예상 지출: {formatNum(totalExpectedSpend)}원
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                현재 내 통장 잔고
              </p>
              <p
                className={`text-xl font-black flex items-center gap-1 justify-end ${
                  currentCashBalance < 0
                    ? 'text-rose-500'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {formatNum(currentCashBalance)}원
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPanicBuyMode(!isPanicBuyMode)}
            className={`flex-1 p-6 rounded-[2.5rem] border-2 transition-all flex items-center justify-center gap-4 group ${
              isPanicBuyMode
                ? 'bg-rose-600 border-rose-600 text-white shadow-2xl scale-105'
                : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 text-slate-400 hover:border-rose-300'
            }`}
          >
            <ArrowDownCircle
              className={isPanicBuyMode ? 'animate-bounce' : ''}
              size={32}
            />
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-tighter opacity-70 leading-none mb-1">
                Smart Panic Buying
              </p>
              <p className="text-xl font-black">
                {isPanicBuyMode ? '비상금 90% 투입 중' : '추매 기회 대기'}
              </p>
            </div>
          </button>
        </div>

        {/* 2. 쇼핑 리스트 */}
        <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <Calculator
                className="text-blue-600 dark:text-blue-400"
                size={24}
              />
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {currentMonth}월 매수 가이드 (
                {isPanicBuyMode ? '🔥풀매수' : '🟢정기'})
              </h2>
              <span className="text-[10px] text-slate-400 font-normal ml-2">
                *수량을 클릭해 수정 가능
              </span>
            </div>
            <button
              onClick={handleSaveToDB}
              disabled={isSaving}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-blue-500/30"
            >
              {isSaving ? (
                <RefreshCcw className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {dbHistory.budgets.some((b) =>
                b.month_date.startsWith(new Date().toISOString().slice(0, 7))
              )
                ? '추가 매수 기록'
                : '장부에 기록하기'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 relative z-10">
            {Object.keys(guide).map((k) => (
              <div
                key={k}
                className={`p-4 sm:p-6 rounded-[2rem] border transition-all ${
                  isPanicBuyMode && guide[k].drop <= -10
                    ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 ring-2 ring-rose-300 dark:ring-rose-600'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none">
                    {NAMES[k]}
                  </p>
                  <span
                    className={`text-[10px] font-bold ${
                      guide[k].drop < 0
                        ? 'text-rose-500'
                        : 'text-emerald-500 dark:text-emerald-400'
                    }`}
                  >
                    {Math.abs(guide[k].drop).toFixed(1)}%{' '}
                    {guide[k].drop < 0 ? '▼ 전월비' : '▲ 전월비'}
                  </span>
                </div>

                {/* 🔴 수량 표시 (수정 가능 + 분리 표기) */}
                <div className="mb-2 relative group">
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step={k === 'btc' ? '0.000001' : '1'}
                      value={Number.isFinite(guide[k].qty) ? guide[k].qty : 0}
                      onChange={(e) =>
                        setManualEdits({
                          ...manualEdits,
                          [k]: Number(e.target.value),
                        })
                      }
                      className="bg-transparent border-b border-transparent group-hover:border-slate-300 dark:group-hover:border-slate-500 focus:border-blue-500 w-24 text-4xl font-black text-slate-900 dark:text-slate-100 p-0 outline-none transition-all"
                    />
                    <span className="text-sm font-bold text-slate-300 dark:text-slate-500">
                      주
                    </span>
                    <Edit3
                      size={12}
                      className="text-slate-300 opacity-0 group-hover:opacity-100"
                    />
                  </div>
                  {isPanicBuyMode && guide[k].extraQty > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-bold text-slate-400">
                        기본 {formatNum(guide[k].baseQty)}
                      </span>
                      <span className="text-xs font-black text-rose-500 animate-pulse">
                        + 추가 {formatNum(guide[k].extraQty)}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-4 leading-tight">
                  예상 체결가: {formatNum(guide[k].price)}원<br />
                  매수액: {formatNum(guide[k].spent)}원
                </p>
              </div>
            ))}
            {/* 이달의 남은 현금 */}
            <div className="bg-slate-900 dark:bg-slate-700 p-4 sm:p-6 rounded-[2.5rem] text-white flex flex-col justify-center shadow-xl">
              <p className="text-[10px] font-bold text-blue-400 uppercase mb-2 leading-none">
                이달의 잔여 현금 (CMA)
              </p>
              <p className="text-2xl font-black leading-none">
                {formatNum(thisMonthResidue)}원
              </p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-[10px] opacity-60">
                  이번달 입금액 - 주식매수액
                </p>
                <p className="text-[10px] opacity-60 text-emerald-400">
                  (하락장 비상금 사용분 제외)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 목표 vs 현재 비중 */}
        <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6 leading-none text-slate-700 dark:text-slate-200">
            <Layers size={18} />
            목표 vs 현재 비중 (%)
          </h2>
          <div className="h-[280px] w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={400}>
              <BarChart
                data={weightChartData}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 70, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.3}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={65}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(v: number | undefined) =>
                    v != null ? v + '%' : ''
                  }
                  labelFormatter={(l) => l}
                  contentStyle={{
                    backgroundColor: darkMode ? '#020617' : '#ffffff',
                    border: '1px solid #64748b',
                    color: darkMode ? '#e5e7eb' : '#0f172a',
                    fontSize: 10,
                  }}
                  labelStyle={{
                    color: darkMode ? '#e5e7eb' : '#0f172a',
                    fontWeight: 700,
                  }}
                />
                <Legend />
                <Bar
                  dataKey="목표비중"
                  fill="#94a3b8"
                  name="목표"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="현재비중"
                  fill="#3b82f6"
                  name="현재"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 3. 보유 자산 현황 (DB) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm relative">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6 sm:mb-8 leading-none text-slate-700 dark:text-slate-200">
              <History size={18} />
              자산 성장 추이 (실제 기록)
            </h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={darkMode ? '#334155' : '#f1f5f9'}
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.slice(2, 7)}
                    interval={2}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v: any) => formatNum(v) + '원'}
                    labelFormatter={(l) => l}
                    contentStyle={{
                      backgroundColor: darkMode ? '#020617' : '#ffffff',
                      border: '1px solid #64748b',
                      color: darkMode ? '#e5e7eb' : '#0f172a',
                      fontSize: 10,
                    }}
                    labelStyle={{
                      color: darkMode ? '#e5e7eb' : '#0f172a',
                      fontWeight: 700,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="investment"
                    name="총 자산"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={true}
                  />
                  <Line
                    type="step"
                    dataKey="principal"
                    name="누적 원금"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
            <h2 className="text-sm font-black uppercase tracking-widest mb-6 leading-none flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Layers size={18} />
              보유 종목 상세
            </h2>
            <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
              {Object.keys(NAMES)
                .filter((k) => k !== 'cash')
                .map((k, i) => {
                  const p = portfolio[k];
                  return (
                    <div
                      key={k}
                      className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-1 h-8 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        ></div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-none">
                            {NAMES[k]}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">
                              {k === 'btc'
                                ? formatDec(p.qty)
                                : formatNum(p.qty)}
                              주
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                              평단: {formatNum(Math.floor(p.avg))}원
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none mb-1">
                          {formatNum(Math.floor(p.val))}원
                        </p>
                        <p
                          className={`text-[10px] font-bold ${
                            p.roi >= 0 ? 'text-blue-500' : 'text-rose-500'
                          }`}
                        >
                          {p.roi.toFixed(1)}% {p.roi >= 0 ? '▲' : '▼'}
                        </p>
                        {p.qty > 0 && p.avg > 0 && (
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            현재가 대비{' '}
                            {(
                              (currentPriceMap[k] / p.avg - 1 || 0) * 100
                            ).toFixed(1)}
                            %
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* 매수 기록 히스토리 */}
        <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <History size={18} />
              매수 기록
            </h2>
            <ChevronDown
              className={`transition-transform ${
                showHistory ? 'rotate-180' : ''
              }`}
              size={20}
            />
          </button>
          {showHistory && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <select
                  value={historyFilterMonth}
                  onChange={(e) => setHistoryFilterMonth(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
                >
                  <option value="">전체 월</option>
                  {Array.from(
                    new Set(dbHistory.records.map((r) => r.date.slice(0, 7)))
                  )
                    .sort()
                    .reverse()
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
                <select
                  value={historyFilterAsset}
                  onChange={(e) => setHistoryFilterAsset(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
                >
                  <option value="">전체 종목</option>
                  {Object.entries(NAMES)
                    .filter(([k]) => k !== 'cash')
                    .map(([k, name]) => (
                      <option key={k} value={k}>
                        {name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="overflow-x-auto max-h-[240px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600">
                <table className="w-full text-xs text-slate-700 dark:text-slate-100">
                  <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 text-slate-900 dark:text-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-black">날짜</th>
                      <th className="px-3 py-2 text-left font-black">종목</th>
                      <th className="px-3 py-2 text-right font-black">단가</th>
                      <th className="px-3 py-2 text-right font-black">수량</th>
                      <th className="px-3 py-2 text-right font-black">금액</th>
                      <th className="px-3 py-2 text-center font-black">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => (
                      <tr
                        key={r.id || r.date + r.asset_key + r.amount}
                        className="border-t border-slate-100 dark:border-slate-600"
                      >
                        <td className="px-3 py-2">{r.date}</td>
                        <td className="px-3 py-2">
                          {NAMES[r.asset_key] ?? r.asset_key}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatNum(Number(r.price))}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.asset_key === 'btc'
                            ? formatDec(Number(r.quantity))
                            : formatNum(Number(r.quantity))}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatNum(Number(r.amount))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.is_panic_buy ? '추매' : '-'}
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-slate-400 dark:text-slate-500"
                        >
                          기록 없음
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* 월별 입금 내역 */}
        <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm">
          <button
            onClick={() => setShowDeposits(!showDeposits)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Banknote size={18} />
              월별 입금 내역
            </h2>
            <ChevronDown
              className={`transition-transform ${
                showDeposits ? 'rotate-180' : ''
              }`}
              size={20}
            />
          </button>
          {showDeposits && (
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600">
              <table className="w-full text-xs text-slate-700 dark:text-slate-100">
                <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 text-slate-900 dark:text-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-black">월</th>
                    <th className="px-3 py-2 text-right font-black">입금액</th>
                  </tr>
                </thead>
                <tbody>
                  {[...dbHistory.budgets].reverse().map((b) => (
                    <tr
                      key={b.id || b.month_date}
                      className="border-t border-slate-100 dark:border-slate-600"
                    >
                      <td className="px-3 py-2">{b.month_date}</td>
                      <td className="px-3 py-2 text-right">
                        {formatNum(Number(b.amount))}원
                      </td>
                    </tr>
                  ))}
                  {dbHistory.budgets.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-3 py-6 text-center text-slate-400 dark:text-slate-500"
                      >
                        기록 없음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 설정 모달 */}
        {showSettings && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowSettings(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
                <h2 className="text-lg font-black flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Settings size={20} /> 비중 설정
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  각 자산의 목표 비중을 입력하세요. 합이 일치하지 않아도 비율로
                  사용됩니다.
                </p>
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    기본 월 투자금액
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9,]*"
                      value={inputBudget.toLocaleString()}
                      onChange={(e) =>
                        setInputBudget(
                          Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                        )
                      }
                      className="w-32 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-right text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-500">원</span>
                  </div>
                </div>
                {Object.keys(DEFAULT_RATIOS).map((k) => (
                  <label
                    key={k}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {NAMES[k]}
                    </span>
                    <input
                      type="number"
                      step={k === 'btc' ? 0.1 : 1}
                      min={0}
                      value={customRatios?.[k] ?? DEFAULT_RATIOS[k]}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        setCustomRatios((prev) => {
                          const next = { ...(prev ?? DEFAULT_RATIOS), [k]: v };
                          localStorage.setItem(
                            STORAGE_KEYS.ratios,
                            JSON.stringify(next)
                          );
                          return next;
                        });
                      }}
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
                    />
                  </label>
                ))}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => saveCustomRatios(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    기본값 복원
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
