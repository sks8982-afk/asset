'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
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
  Activity,
  Coins,
  RefreshCcw,
  ArrowDownCircle,
  Save,
  TrendingUp,
  AlertTriangle,
  Layers,
  Database,
  Trash2,
  Edit3,
  History,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  nasdaq: '나스닥100',
  dividend: '배당다우존스',
  semi: '미국반도체',
  snp: 'S&P500',
  gold: '금은선물(H)',
  cash: '현금(CMA)',
  btc: '비트코인',
};
// 전체 비중 합: 11.5 (주식/코인 10.5 + 현금 1)
const RATIOS: Record<string, number> = {
  nasdaq: 2,
  dividend: 2,
  semi: 2,
  snp: 2,
  gold: 2,
  cash: 1,
  btc: 0.5,
};

export default function RealDbTower() {
  const [inputBudget, setInputBudget] = useState(1200000);
  const [marketData, setMarketData] = useState<any[]>([]);
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
  const [manualEdits, setManualEdits] = useState<Record<string, number>>({}); // 수동 수정 저장소

  const loadAllData = async () => {
    const res = await fetch('/api/market');
    const mData = await res.json();
    if (Array.isArray(mData))
      setMarketData(mData.filter((d) => d.d >= '2025-01'));
    const { data: bData } = await supabase
      .from('monthly_budgets')
      .select('*')
      .order('month_date', { ascending: true });
    const { data: rData } = await supabase
      .from('investment_records')
      .select('*')
      .order('date', { ascending: true });
    setDbHistory({ budgets: bData || [], records: rData || [] });
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
    setCurrentMonth(new Date().getMonth() + 1);
  }, []);

  // 1. 내 자산 현황 분석 (DB 기준)
  const myAccount = useMemo(() => {
    if (!marketData.length) return null;
    const currentPriceMap = marketData[marketData.length - 1];
    const prevPriceMap = marketData[marketData.length - 2] || currentPriceMap;

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

    // 차트 데이터 (DB기반 역추적)
    const chartHistory = marketData.map((mPoint) => {
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
        (currentPriceMap[k] / prevPriceMap[k] - 1) * 100 <= -10,
    );

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
    };
  }, [marketData, dbHistory]);

  // 2. 매수 가이드 계산 (핵심 로직)
  const buyPlan = useMemo(() => {
    if (!myAccount) return null;
    const { currentCashBalance, currentPriceMap, prevPriceMap, portfolio } =
      myAccount;

    // A. 정기 매수 (Monthly) - 이번달 입금액 기준
    // 분모 11.5를 기준으로 전체 예산 배정 (현금 비중 1도 포함된 상태에서 주식 비중만큼 할당)

    // B. 추매 (Panic) - 보유 현금 기준
    let panicBudget = 0;
    if (isPanicBuyMode) {
      panicBudget = currentCashBalance * 0.9;
    }

    const guide: any = {};
    let totalMonthlySpend = 0; // 이번달 월급에서 나간 돈

    Object.keys(RATIOS)
      .filter((k) => k !== 'cash')
      .forEach((k) => {
        const curP = currentPriceMap[k];
        const prevP = prevPriceMap[k];
        const drop = (curP / prevP - 1) * 100;

        // 1. 기본 매수량 (정기)
        const baseAlloc = inputBudget * (RATIOS[k] / 11.5);
        let baseQty = 0;
        if (k === 'btc') baseQty = baseAlloc / curP;
        else baseQty = Math.floor(baseAlloc / curP);

        // 2. 추가 매수량 (추매) - 스마트 가중치
        let extraQty = 0;
        if (isPanicBuyMode && panicBudget > 0) {
          let weight = RATIOS[k];
          // 스마트 로직: 하락폭 크거나(-10%), 비중 적으면(underweight) 더 삼
          if (drop <= -10) weight += 2;
          const targetWeight = (RATIOS[k] / 11.5) * 100;
          if (portfolio[k].weight < targetWeight - 2) weight += 1;

          const totalWeight = Object.keys(RATIOS)
            .filter((rk) => rk !== 'cash')
            .reduce((sum, rk) => {
              const d =
                ((currentPriceMap[rk] / prevPriceMap[rk] || 1) - 1) * 100;
              let w = RATIOS[rk];
              if (d <= -10) w += 2;
              if (portfolio[rk].weight < (RATIOS[rk] / 11.5) * 100 - 2) w += 1;
              return sum + w;
            }, 0);

          const extraAlloc = panicBudget * (weight / totalWeight);
          if (k === 'btc') extraQty = extraAlloc / curP;
          else extraQty = Math.floor(extraAlloc / curP);
        }

        // 3. 수동 수정 반영 (Manual Override)
        // 사용자가 입력한 값이 있으면 그걸 finalQty로 침
        // baseQty는 유지하고, extraQty를 조절하는 방식으로 역산
        let finalQty = baseQty + extraQty;
        if (manualEdits[k] !== undefined) {
          finalQty = manualEdits[k];
          // 수동 수정 시 기본량은 그대로 두고 추가량으로 처리 (혹은 반대)
          // 여기선 baseQty를 우선 채우고 나머지를 extra로 간주
          extraQty = Math.max(0, finalQty - baseQty);
        }

        const spent = finalQty * curP;
        const baseSpent = baseQty * curP; // 정기 매수분 추정치

        // *중요: 정기 매수 잔돈 계산을 위해 baseSpent만 따로 집계
        // 단, 수동 수정으로 baseQty보다 적게 사면 정기 매수분도 줄어든 걸로 계산
        const actualBaseSpent = Math.min(spent, baseSpent);
        totalMonthlySpend += actualBaseSpent;

        guide[k] = {
          qty: finalQty,
          baseQty,
          extraQty,
          price: curP,
          spent,
          drop,
        };
      });

    // 🔴 이달의 남은 현금 (잔액) 계산
    // 공식: 입력금액 - (실제 정기매수로 나간 돈)
    // *비트코인 등 수동 수정으로 더 많이 사서 baseAlloc을 넘어가면? -> 그건 추가자금(CMA)에서 나간걸로 침
    // 즉, 여기 표시되는 건 "이번달 월급 120만원 안에서 주식 사고 남은 순수 잉여금"
    const thisMonthResidue = inputBudget - totalMonthlySpend;

    return { guide, thisMonthResidue };
  }, [myAccount, inputBudget, isPanicBuyMode, manualEdits]);

  const handleSaveToDB = async () => {
    if (!buyPlan || !myAccount) return;

    // 중복 체크
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const existingBudget = dbHistory.budgets.find((b) =>
      b.month_date.startsWith(currentYearMonth),
    );

    let confirmMsg = `[${currentMonth}월 장부 기록]\n\n이달의 잔여 현금: ${formatNum(buyPlan.thisMonthResidue)}원\n\n이대로 저장하시겠습니까?`;
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

  if (loading || !myAccount || !buyPlan)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-black text-slate-400">
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
  } = myAccount;
  const { guide, thisMonthResidue } = buyPlan;
  const formatNum = (n: number) => Math.floor(n).toLocaleString();
  const formatDec = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  const totalRoi =
    totalInvested > 0 ? (totalAsset / totalInvested - 1) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
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
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">
                Real-Time DB Ledger
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 leading-none tracking-tighter">
              실전 <span className="text-blue-600">투자 장부</span>
            </h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleResetDB}
              className="bg-white text-slate-400 p-4 rounded-3xl border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all flex flex-col items-center justify-center gap-1"
            >
              <Trash2 size={18} />
              <span className="text-[9px] font-black uppercase">DB 초기화</span>
            </button>
            <div className="bg-slate-900 px-6 py-4 rounded-3xl text-white shadow-2xl flex gap-6 border-b-4 border-blue-600">
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
                  className={`text-2xl font-black ${totalRoi >= 0 ? 'text-blue-400' : 'text-rose-400'}`}
                >
                  {totalRoi > 0 ? '+' : ''}
                  {totalRoi.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* 1. 입력 & 현황판 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                  {dbHistory.budgets.some((b) =>
                    b.month_date.startsWith(
                      new Date().toISOString().slice(0, 7),
                    ),
                  )
                    ? '이번 달 추가 입금액'
                    : '이번 달 투자 원금'}
                </p>
                <input
                  type="text"
                  value={inputBudget.toLocaleString()}
                  onChange={(e) =>
                    setInputBudget(
                      Number(e.target.value.replace(/[^0-9]/g, '')),
                    )
                  }
                  className="bg-transparent border-none p-0 font-black text-2xl text-blue-600 focus:ring-0 w-40 outline-none"
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                현재 내 통장 잔고
              </p>
              <p
                className={`text-xl font-black flex items-center gap-1 justify-end ${currentCashBalance < 0 ? 'text-rose-500' : 'text-slate-700'}`}
              >
                {formatNum(currentCashBalance)}원
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPanicBuyMode(!isPanicBuyMode)}
            className={`flex-1 p-6 rounded-[2.5rem] border-2 transition-all flex items-center justify-center gap-4 group ${isPanicBuyMode ? 'bg-rose-600 border-rose-600 text-white shadow-2xl scale-105' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-300'}`}
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
        <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Calculator className="text-blue-600" size={24} />
              <h2 className="text-xl font-black tracking-tight">
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
                b.month_date.startsWith(new Date().toISOString().slice(0, 7)),
              )
                ? '추가 매수 기록'
                : '장부에 기록하기'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
            {Object.keys(guide).map((k) => (
              <div
                key={k}
                className={`p-6 rounded-[2rem] border transition-all ${isPanicBuyMode && guide[k].drop <= -10 ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-300' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none">
                    {NAMES[k]}
                  </p>
                  <span
                    className={`text-[10px] font-bold ${guide[k].drop < 0 ? 'text-rose-500' : 'text-emerald-500'}`}
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
                      value={guide[k].qty}
                      onChange={(e) =>
                        setManualEdits({
                          ...manualEdits,
                          [k]: Number(e.target.value),
                        })
                      }
                      className="bg-transparent border-b border-transparent group-hover:border-slate-300 focus:border-blue-500 w-24 text-4xl font-black text-slate-900 p-0 outline-none transition-all"
                    />
                    <span className="text-sm font-bold text-slate-300">주</span>
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

                <p className="text-[10px] font-bold text-slate-400 mt-4 leading-tight">
                  예상 체결가: {formatNum(guide[k].price)}원<br />
                  매수액: {formatNum(guide[k].spent)}원
                </p>
              </div>
            ))}
            {/* 🔴 이달의 남은 현금 */}
            <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex flex-col justify-center shadow-xl">
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

        {/* 3. 보유 자산 현황 (DB) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm relative">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-8 leading-none">
              <History size={18} />
              자산 성장 추이 (실제 기록)
            </h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
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

          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <h2 className="text-sm font-black uppercase tracking-widest mb-6 leading-none flex items-center gap-2">
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
                      className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-1 h-8 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        ></div>
                        <div>
                          <p className="text-xs font-black text-slate-800 leading-none">
                            {NAMES[k]}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                              {k === 'btc'
                                ? formatDec(p.qty)
                                : formatNum(p.qty)}
                              주
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              평단: {formatNum(Math.floor(p.avg))}원
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 leading-none mb-1">
                          {formatNum(Math.floor(p.val))}원
                        </p>
                        <p
                          className={`text-[10px] font-bold ${p.roi >= 0 ? 'text-blue-500' : 'text-rose-500'}`}
                        >
                          {p.roi.toFixed(1)}% {p.roi >= 0 ? '▲' : '▼'}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
