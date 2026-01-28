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
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  PieChart as PieIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChartData {
  date: string;
  total_investment: number;
  savings_balance: number;
  inflation_adjusted: number;
  status: string;
}

const COLORS = ['#3b82f6', '#f59e0b', '#94a3b8', '#f97316'];

export default function Dashboard() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: dbData, error } = await supabase
          .from('asset_history')
          .select('*')
          .order('date', { ascending: true });
        if (dbData && !error) setData(dbData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">
        데이터 통합 분석 중...
      </div>
    );

  const last = data[data.length - 1] || {
    total_investment: 0,
    savings_balance: 0,
    inflation_adjusted: 0,
    status: 'stable',
  };
  const profit = last.total_investment - last.savings_balance;
  const profitRate =
    last.savings_balance > 0
      ? ((profit / last.savings_balance) * 100).toFixed(1)
      : '0.0';

  const assetDetails = [
    {
      name: '미국 주식',
      ratio: 70,
      return: '+61%',
      principal: last.savings_balance * 0.7,
      value: last.total_investment * 0.65,
    },
    {
      name: '금 (현물)',
      ratio: 15,
      return: '+48%',
      principal: last.savings_balance * 0.15,
      value: last.total_investment * 0.18,
    },
    {
      name: '은 (현물)',
      ratio: 5,
      return: '+29%',
      principal: last.savings_balance * 0.05,
      value: last.total_investment * 0.05,
    },
    {
      name: '비트코인',
      ratio: 10,
      return: '+223%',
      principal: last.savings_balance * 0.1,
      value: last.total_investment * 0.12,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
              종합 자산 대시보드
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              {data[0]?.date} ~ {last.date} 시뮬레이션
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl w-full sm:w-auto text-center sm:text-right">
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
              Total Return
            </p>
            <p className="text-2xl font-black text-blue-600">+{profitRate}%</p>
          </div>
        </header>

        {last.status === 'rebalance' && (
          <div className="mb-8 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-500" />
              <div>
                <p className="text-sm font-bold text-amber-900">
                  리밸런싱 필요
                </p>
                <p className="text-xs text-amber-700 font-medium text-pretty">
                  자산 비중이 7:2:1 범위를 벗어났습니다. 조절을 검토하세요.
                </p>
              </div>
            </div>
            <RefreshCw
              size={18}
              className="text-amber-400 animate-spin-slow cursor-pointer"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card
            icon={<TrendingUp className="text-blue-500" />}
            title="현재 총 자산"
            value={`${last.total_investment.toLocaleString()}원`}
            sub="환율 반영 평가액"
          />
          <Card
            icon={<Landmark className="text-emerald-500" />}
            title="누적 투자 원금"
            value={`${last.savings_balance.toLocaleString()}원`}
            sub="적립식 총 납입금"
          />
          <Card
            icon={<Coins className="text-amber-500" />}
            title="누적 수익금"
            value={`${profit.toLocaleString()}원`}
            sub="순수익 실적"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-6 italic">Growth Trend</h2>
            <div className="h-[300px] sm:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.slice(2, 7)}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v) =>
                      Math.floor(Number(v)).toLocaleString() + '원'
                    }
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="total_investment"
                    name="내 자산"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings_balance"
                    name="예금"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="inflation_adjusted"
                    name="원금"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h2 className="text-lg font-bold mb-4 self-start flex items-center gap-2">
              <PieIcon size={20} /> Asset Mix
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
                    {assetDetails.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
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
            <div className="w-full space-y-2 mt-4 text-[11px] font-bold">
              {assetDetails.map((asset, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-gray-500"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[idx] }}
                    ></div>
                    {asset.name}
                  </div>
                  <span className="text-gray-900">{asset.ratio}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="text-lg font-bold mb-6">자산별 투자 성과 상세</h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  <th className="pb-4">항목</th>
                  <th className="pb-4 text-right">투자 원금</th>
                  <th className="pb-4 text-center"></th>
                  <th className="pb-4 text-right">현재 평가액</th>
                  <th className="pb-4 text-right">수익률</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {assetDetails.map((asset, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-5 font-bold text-gray-800">
                      {asset.name}
                    </td>
                    <td className="text-right text-gray-500 font-medium">
                      {Math.floor(asset.principal).toLocaleString()}원
                    </td>
                    <td className="text-center text-gray-300">
                      <ArrowRight size={14} className="inline" />
                    </td>
                    <td className="text-right font-black text-gray-900">
                      {Math.floor(asset.value).toLocaleString()}원
                    </td>
                    <td className="text-right">
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold text-[10px]">
                        {asset.return}
                      </span>
                    </td>
                  </tr>
                ))}
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all">
      <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5 tracking-tight">
          {title}
        </p>
        <p className="text-xl font-black text-gray-900 leading-tight">
          {value}
        </p>
        <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase">
          {sub}
        </p>
      </div>
    </div>
  );
}
