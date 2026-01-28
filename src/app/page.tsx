'use client';
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Landmark,
  Info,
  Zap,
  PieChart as PieIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const COLORS = [
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#f59e0b',
  '#94a3b8',
  '#f97316',
];

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: dbData } = await supabase
        .from('asset_history')
        .select('*')
        .order('date', { ascending: true });
      if (dbData)
        setData(
          dbData.map((item) => ({
            ...item,
            details:
              typeof item.details === 'string'
                ? JSON.parse(item.details)
                : item.details,
          })),
        );
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-400 text-sm">
        61개월 정밀 시세 데이터 분석 중...
      </div>
    );

  const last = data[data.length - 1] || {};
  const totalPrincipal = last.savings_balance || 0;
  const currentTotal = last.total_investment || 0;
  const inflationValue = last.inflation_adjusted || 0;
  const realProfit = currentTotal - inflationValue;
  const realProfitRate =
    totalPrincipal > 0
      ? ((realProfit / totalPrincipal) * 100).toFixed(1)
      : '0.0';

  const d = last.details || {};
  const assetDetails = [
    {
      name: 'S&P 500',
      principal: totalPrincipal * 0.35,
      value: d.valS || 0,
      color: COLORS[0],
    },
    {
      name: 'QQQ (나스닥)',
      principal: totalPrincipal * 0.25,
      value: d.valQ || 0,
      color: COLORS[1],
    },
    {
      name: '배당주 (SCHD)',
      principal: totalPrincipal * 0.1,
      value: d.valD || 0,
      color: COLORS[2],
    },
    {
      name: '금 (현물)',
      principal: totalPrincipal * 0.15,
      value: d.valG || 0,
      color: COLORS[3],
    },
    {
      name: '은 (현물)',
      principal: totalPrincipal * 0.05,
      value: d.valSi || 0,
      color: COLORS[4],
    },
    {
      name: '비트코인',
      principal: totalPrincipal * 0.1,
      value: d.valC || 0,
      color: COLORS[5],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 text-gray-900 font-sans text-xs">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-blue-600 italic">
              PURCHASING POWER
            </h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-tight">
              2021-2026.01 HISTORICAL REAL-DATA
            </p>
          </div>
          <div className="bg-blue-600 px-4 py-2 rounded-xl text-white text-right shadow-lg">
            <p className="text-[8px] font-bold opacity-70 uppercase">
              Real Net Profit Rate
            </p>
            <p className="text-lg font-black">+{realProfitRate}%</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <Card
            theme="bg-blue-500"
            icon={<TrendingUp size={20} />}
            title="평가액 합계"
            value={`${currentTotal.toLocaleString()}원`}
            sub="환율 반영"
          />
          <Card
            theme="bg-emerald-500"
            icon={<Landmark size={20} />}
            title="누적 투자금"
            value={`${totalPrincipal.toLocaleString()}원`}
            sub="61회차 적립"
          />
          <Card
            theme="bg-indigo-600"
            icon={<Zap size={20} />}
            title="실질 수익"
            value={`${realProfit.toLocaleString()}원`}
            sub="물가상승분 제외 결과"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold mb-4">구매력 성장 곡선</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={8}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v?.slice(2, 7)}
                    interval={5}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v) =>
                      Math.floor(Number(v)).toLocaleString() + '원'
                    }
                  />
                  <Legend verticalAlign="top" height={30} iconSize={8} />
                  <Line
                    type="monotone"
                    dataKey="total_investment"
                    name="내 자산"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="inflation_adjusted"
                    name="물가반영 원금"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings_balance"
                    name="단순 원금"
                    stroke="#10b981"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h2 className="font-bold mb-4 self-start flex items-center gap-2">
              <PieIcon size={16} /> 자산 구성
            </h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetDetails}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {assetDetails.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) =>
                      Math.floor(Number(v)).toLocaleString() + '원'
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-1 mt-4">
              {assetDetails.map((asset, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center px-2 text-[10px] text-gray-500"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: asset.color }}
                    ></div>
                    {asset.name}
                  </div>
                  <span className="font-bold text-gray-900">
                    {((asset.value / currentTotal) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="font-bold mb-4">자산 실적 vs 인플레이션 상세</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-[8px] uppercase font-bold tracking-widest">
                  <th className="pb-3">항목</th>
                  <th className="pb-3 text-right">투자 원금</th>
                  <th className="pb-3 text-right">현재 가치</th>
                  <th className="pb-3 text-right">수익률</th>
                </tr>
              </thead>
              <tbody>
                {assetDetails.map((asset, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 font-bold text-gray-700">
                      {asset.name}
                    </td>
                    <td className="text-right text-gray-500">
                      {Math.floor(asset.principal).toLocaleString()}원
                    </td>
                    <td className="text-right font-black text-gray-900">
                      {Math.floor(asset.value).toLocaleString()}원
                    </td>
                    <td className="text-right">
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black text-[8px]">
                        +
                        {((asset.value / asset.principal - 1) * 100).toFixed(1)}
                        %
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-rose-50/50">
                  <td className="py-3 font-bold text-rose-600 flex items-center gap-2">
                    <Info size={12} /> 물가 상승 (화폐가치 하락)
                  </td>
                  <td className="text-right text-gray-500">
                    {totalPrincipal.toLocaleString()}원
                  </td>
                  <td className="text-right font-black text-rose-600">
                    {Math.floor(inflationValue).toLocaleString()}원
                  </td>
                  <td className="text-right">
                    <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-black text-[8px]">
                      +
                      {((inflationValue / totalPrincipal - 1) * 100).toFixed(1)}
                      %
                    </span>
                  </td>
                </tr>
                <tr className="bg-indigo-50 border-t border-indigo-100 font-black">
                  <td className="py-4 text-indigo-700 uppercase">
                    Real Profit (실질 수익)
                  </td>
                  <td className="text-right text-indigo-400">
                    명목 {(currentTotal - totalPrincipal).toLocaleString()}원
                  </td>
                  <td className="text-right text-indigo-700 text-sm underline">
                    {realProfit.toLocaleString()}원
                  </td>
                  <td className="text-right">
                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg font-black text-[8px]">
                      NET +{realProfitRate}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, value, sub, theme }: any) {
  return (
    <div
      className={`${theme} p-4 rounded-2xl shadow-sm flex items-center gap-3 transition-transform hover:scale-105`}
    >
      <div className="p-2 bg-white/20 rounded-xl">{icon}</div>
      <div>
        <p className="text-[8px] font-bold uppercase mb-0.5 opacity-80">
          {title}
        </p>
        <p className="text-sm font-black leading-tight">{value}</p>
        <p className="text-[8px] font-bold mt-0.5 opacity-70">{sub}</p>
      </div>
    </div>
  );
}
