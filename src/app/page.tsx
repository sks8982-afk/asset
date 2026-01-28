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
  PieChart as PieIcon,
  ArrowRight,
  Menu,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChartData {
  date: string;
  investment: number;
  savings: number;
  inflation: number;
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
        if (dbData && !error) {
          setData(
            dbData.map((item) => ({
              date: item.date,
              investment: Number(item.total_investment),
              savings: Number(item.savings_balance),
              inflation: Number(item.inflation_adjusted),
            })),
          );
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">
        데이터 분석 중...
      </div>
    );

  const last = data[data.length - 1] || {
    investment: 0,
    savings: 0,
    inflation: 0,
  };
  const totalInjected = last.inflation;
  const profit = last.investment - totalInjected;
  const profitRate = ((profit / totalInjected) * 100).toFixed(1);

  const assetDetails = [
    {
      name: '미국 주식',
      ratio: 70,
      return: '+61%',
      principal: totalInjected * 0.7,
      value: last.investment * 0.65,
    },
    {
      name: '금 (현물)',
      ratio: 15,
      return: '+48%',
      principal: totalInjected * 0.15,
      value: last.investment * 0.18,
    },
    {
      name: '은 (현물)',
      ratio: 5,
      return: '+29%',
      principal: totalInjected * 0.05,
      value: last.investment * 0.05,
    },
    {
      name: '비트코인',
      ratio: 10,
      return: '+223%',
      principal: totalInjected * 0.1,
      value: last.investment * 0.12,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              장기 투자 대시보드
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              2021.01 ~ 2026.01 적립식 시뮬레이션
            </p>
          </div>
          <div className="text-left sm:text-right bg-blue-50 p-3 rounded-2xl border border-blue-100 w-full sm:w-auto">
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
              Total Profit Rate
            </p>
            <p className="text-2xl font-black text-blue-600">+{profitRate}%</p>
          </div>
        </header>

        {/* 상단 카드 섹션 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card
            icon={<TrendingUp className="text-blue-500" />}
            title="현재 총 자산"
            value={`${last.investment.toLocaleString()}원`}
            sub="평가 금액 합계"
          />
          <Card
            icon={<Landmark className="text-emerald-500" />}
            title="누적 투자 원금"
            value={`${totalInjected.toLocaleString()}원`}
            sub="5년간 총 납입액"
          />
          <Card
            icon={<Coins className="text-amber-500" />}
            title="누적 순수익"
            value={`${profit.toLocaleString()}원`}
            sub="원금 대비 수익"
          />
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-6">자산 성장 추이</h2>
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
                    formatter={(val: any) => [
                      Math.floor(Number(val)).toLocaleString() + '원',
                    ]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="investment"
                    name="내 자산"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    name="예금"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="inflation"
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

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h2 className="text-lg font-bold mb-4 self-start flex items-center gap-2">
              <PieIcon size={20} /> 자산 비중
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
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) =>
                      Math.floor(val).toLocaleString() + '원'
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-4 text-[11px]">
              {assetDetails.map((asset, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center px-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[idx] }}
                    ></div>
                    <span className="text-gray-600">{asset.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {asset.ratio}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 상세 테이블 섹션 */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="text-lg font-bold mb-6">자산별 투자 성과 상세</h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold tracking-tighter">
                    <th className="pb-4">투자 항목</th>
                    <th className="pb-4 text-right">투자 원금</th>
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
                      <td className="py-5 font-bold text-gray-700 whitespace-nowrap">
                        {asset.name}
                      </td>
                      <td className="text-right text-gray-500 font-medium whitespace-nowrap">
                        {Math.floor(asset.principal).toLocaleString()}원
                      </td>
                      <td className="text-right font-black text-gray-900 whitespace-nowrap">
                        {Math.floor(asset.value).toLocaleString()}원
                      </td>
                      <td className="text-right">
                        <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold text-[10px] whitespace-nowrap">
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
    </div>
  );
}

function Card({
  icon,
  title,
  value,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all">
      <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5 truncate">
          {title}
        </p>
        <p className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
          {value}
        </p>
        <p className="text-[10px] text-blue-500 font-bold mt-0.5 truncate">
          {sub}
        </p>
      </div>
    </div>
  );
}
