'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Layers, Scale } from 'lucide-react';

export type WeightChartDataPoint = {
  name: string;
  key: string;
  목표비중: number;
  현재비중: number;
};

type WeightChartSectionProps = {
  weightChartData: WeightChartDataPoint[];
  darkMode: boolean;
  onOpenRebalancing?: () => void;
};

export function WeightChartSection({
  weightChartData,
  darkMode,
  onOpenRebalancing,
}: WeightChartSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 leading-none text-slate-700 dark:text-slate-200">
          <Layers size={18} />
          목표 vs 현재 비중 (%)
        </h2>
        {onOpenRebalancing && (
          <button
            type="button"
            onClick={onOpenRebalancing}
            className="px-4 py-2 rounded-2xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Scale size={14} />
            리밸런싱 가이드
          </button>
        )}
      </div>
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
  );
}
