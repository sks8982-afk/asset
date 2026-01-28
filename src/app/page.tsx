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
  Coins,
  Landmark,
  ArrowRight,
  PieChart as PieIcon,
  Info,
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
      try {
        const { data: dbData, error } = await supabase
          .from('asset_history')
          .select('*')
          .order('date', { ascending: true });
        if (error) throw error;
        if (dbData) {
          const formatted = dbData.map((item) => ({
            ...item,
            total_investment: item.total_investment || 0,
            savings_balance: item.savings_balance || 0,
            inflation_adjusted: item.inflation_adjusted || 0,
            details:
              typeof item.details === 'string'
                ? JSON.parse(item.details)
                : item.details,
          }));
          setData(formatted);
        }
      } catch (err) {
        console.error('Data Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">
        데이터를 불러오는 중...
      </div>
    );

  const last = data[data.length - 1];
  const totalPrincipal = last?.savings_balance || 0;
  const currentTotal = last?.total_investment || 0;
  const inflationValue = last?.inflation_adjusted || 0; // DB에 저장된 물가 반영 수치

  const profit = currentTotal - totalPrincipal;
  const profitRate =
    totalPrincipal > 0 ? ((profit / totalPrincipal) * 100).toFixed(1) : '0.0';
  const inflationRate =
    totalPrincipal > 0
      ? (((inflationValue - totalPrincipal) / totalPrincipal) * 100).toFixed(1)
      : '0.0';

  const d = last?.details || {};
  const assetDetails = [
    {
      name: 'S&P 500',
      principal: totalPrincipal * 0.35,
      value: d.valS || 0,
      color: COLORS[0],
      return: '+61.2%',
    },
    {
      name: 'QQQ (나스닥)',
      principal: totalPrincipal * 0.25,
      value: d.valQ || 0,
      color: COLORS[1],
      return: '+96.4%',
    },
    {
      name: '배당주 (SCHD)',
      principal: totalPrincipal * 0.1,
      value: d.valD || 0,
      color: COLORS[2],
      return: '+48.2%',
    },
    {
      name: '금 (현물)',
      principal: totalPrincipal * 0.15,
      value: d.valG || 0,
      color: COLORS[3],
      return: '+85.5%',
    },
    {
      name: '은 (현물)',
      principal: totalPrincipal * 0.05,
      value: d.valSi || 0,
      color: COLORS[4],
      return: '+66.8%',
    },
    {
      name: '비트코인',
      principal: totalPrincipal * 0.1,
      value: d.valC || 0,
      color: COLORS[5],
      return: '+262.1%',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-blue-600">
              ASSET TRACKER v2.2
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-widest">
              Historical Performance vs Inflation
            </p>
          </div>
          <div className="bg-white border-2 border-blue-600 px-6 py-3 rounded-2xl text-right shadow-[4px_4px_0px_0px_rgba(37,99,235,1)]">
            <p className="text-[10px] font-bold text-blue-400 uppercase">
              Total Profit Rate
            </p>
            <p className="text-2xl font-black text-blue-600">+{profitRate}%</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            icon={<TrendingUp />}
            title="현재 평가액"
            value={`${currentTotal.toLocaleString()}원`}
            sub="전체 자산 가치"
          />
          <Card
            icon={<Landmark />}
            title="누적 투자금"
            value={`${totalPrincipal.toLocaleString()}원`}
            sub="실제 투입 원금"
          />
          <Card
            icon={<Coins />}
            title="순수익 실적"
            value={`${profit.toLocaleString()}원`}
            sub="수익금 현황"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              성장 추이 (2021-2026)
            </h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
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
                    tickFormatter={(v) => v?.slice(2, 7)}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v) =>
                      Math.floor(Number(v)).toLocaleString() + '원'
                    }
                    contentStyle={{ borderRadius: '16px', border: 'none' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    type="monotone"
                    dataKey="total_investment"
                    name="총 자산"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings_balance"
                    name="원금 합계"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="inflation_adjusted"
                    name="물가반영 원금"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h2 className="text-lg font-bold mb-4 self-start flex items-center gap-2">
              <PieIcon size={20} /> 자산 구성비
            </h2>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetDetails}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
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
          </div>
        </div>

        <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="text-lg font-bold mb-6">종목별 실측 성과 상세</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  <th className="pb-4 text-left">종목명</th>
                  <th className="pb-4 text-right">투자 원금</th>
                  <th className="pb-4 text-right">현재 평가액</th>
                  <th className="pb-4 text-right">누적 수익률</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {assetDetails.map((asset, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-5 font-bold text-gray-800 flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: asset.color }}
                      ></div>
                      {asset.name}
                    </td>
                    <td className="text-right text-gray-500 font-medium">
                      {Math.floor(asset.principal).toLocaleString()}원
                    </td>
                    <td className="text-right font-black text-gray-900">
                      {Math.floor(asset.value).toLocaleString()}원
                    </td>
                    <td className="text-right">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black text-[10px]">
                        {asset.return}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* 물가상승률 행 추가 */}
                <tr className="bg-rose-50/50">
                  <td className="py-5 font-bold text-rose-600 flex items-center gap-3 pl-2">
                    <Info size={14} />
                    화폐 가치 하락 (물가상승)
                  </td>
                  <td className="text-right text-gray-500 font-medium">
                    {totalPrincipal.toLocaleString()}원
                  </td>
                  <td className="text-right font-black text-rose-600">
                    {Math.floor(inflationValue).toLocaleString()}원
                  </td>
                  <td className="text-right">
                    <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full font-black text-[10px]">
                      +{inflationRate}%
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

function Card({ icon, title, value, sub }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">{icon}</div>
      <div>
        <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">
          {title}
        </p>
        <p className="text-xl font-black text-gray-900 leading-tight">
          {value}
        </p>
        <p className="text-[10px] text-blue-400 font-medium">{sub}</p>
      </div>
    </div>
  );
}
