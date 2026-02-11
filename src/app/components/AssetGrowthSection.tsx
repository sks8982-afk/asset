'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { History } from 'lucide-react';

export type ChartHistoryPoint = {
  date: string;
  investment?: number;
  principal?: number;
  [key: string]: string | number | undefined;
};

type AssetGrowthSectionProps = {
  chartHistory: ChartHistoryPoint[];
  darkMode: boolean;
  formatNum: (n: number) => string;
  assetChartView: 'total' | 'byAsset';
  setAssetChartView: (v: 'total' | 'byAsset') => void;
  chartLegendHidden: { investment: boolean; principal: boolean };
  setChartLegendHidden: React.Dispatch<
    React.SetStateAction<{ investment: boolean; principal: boolean }>
  >;
  hiddenAssetSeries: Record<string, boolean>;
  setHiddenAssetSeries: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  names: Record<string, string>;
  colors: string[];
};

function renderAssetEndLabel(
  props: { x?: number; y?: number; index?: number; value?: number },
  label: string,
  lastIndex: number,
  darkMode: boolean
) {
  const { x = 0, y = 0, index = 0, value } = props;
  if (index !== lastIndex || value == null) return null;
  return (
    <text
      x={x + 4}
      y={y}
      dy={3}
      fontSize={9}
      fill={darkMode ? '#e5e7eb' : '#0f172a'}
    >
      {label}
    </text>
  );
}

export function AssetGrowthSection({
  chartHistory,
  darkMode,
  formatNum,
  assetChartView,
  setAssetChartView,
  chartLegendHidden,
  setChartLegendHidden,
  hiddenAssetSeries,
  setHiddenAssetSeries,
  names,
  colors,
}: AssetGrowthSectionProps) {
  const lastIndex = chartHistory.length - 1;
  const assetKeys = Object.keys(names).filter((k) => k !== 'cash');

  return (
    <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm relative">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 leading-none text-slate-700 dark:text-slate-200">
          <History size={18} />
          자산 성장 추이 (실제 기록)
        </h2>
        <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/80 p-1 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setAssetChartView('total')}
            className={`px-3 py-1 rounded-full transition-all ${
              assetChartView === 'total'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-300'
            }`}
          >
            총합 보기
          </button>
          <button
            type="button"
            onClick={() => setAssetChartView('byAsset')}
            className={`px-3 py-1 rounded-full transition-all ${
              assetChartView === 'byAsset'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-300'
            }`}
          >
            종목별로 보기
          </button>
        </div>
      </div>
      <div className="w-full">
        {assetChartView === 'total' ? (
          <div className="h-[300px]">
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
                  formatter={(v: number) => formatNum(v) + '원'}
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
                  content={() => (
                    <div className="flex flex-wrap gap-4 justify-center mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setChartLegendHidden((p) => ({
                            ...p,
                            investment: !p.investment,
                          }))
                        }
                        className={`flex items-center gap-1.5 text-[10px] font-bold cursor-pointer transition-opacity ${
                          chartLegendHidden.investment
                            ? 'opacity-50'
                            : 'opacity-100'
                        } ${
                          darkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: '#3b82f6' }}
                        />
                        총 자산
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setChartLegendHidden((p) => ({
                            ...p,
                            principal: !p.principal,
                          }))
                        }
                        className={`flex items-center gap-1.5 text-[10px] font-bold cursor-pointer transition-opacity ${
                          chartLegendHidden.principal
                            ? 'opacity-50'
                            : 'opacity-100'
                        } ${
                          darkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: darkMode
                              ? '#4ade80'
                              : '#22c55e',
                          }}
                        />
                        누적 원금
                      </button>
                    </div>
                  )}
                />
                {!chartLegendHidden.investment && (
                  <Line
                    type="monotone"
                    dataKey="investment"
                    name="총 자산"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={true}
                    isAnimationActive={false}
                  />
                )}
                {!chartLegendHidden.principal && (
                  <Line
                    type="monotone"
                    dataKey="principal"
                    name="누적 원금"
                    stroke={darkMode ? '#4ade80' : '#22c55e'}
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{
                      r: 2,
                      fill: darkMode ? '#4ade80' : '#22c55e',
                    }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <>
            <div className="mb-2 text-[10px] flex flex-col gap-1">
              <div className="flex flex-wrap justify-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() =>
                    setHiddenAssetSeries((prev) => {
                      const next = { ...prev };
                      const valueKeys = assetKeys.map((k) => `value_${k}`);
                      const allHidden =
                        valueKeys.length > 0 &&
                        valueKeys.every((k) => next[k]);
                      const nextHidden = !allHidden;
                      valueKeys.forEach((k) => {
                        next[k] = nextHidden;
                      });
                      return next;
                    })
                  }
                  className="px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-100"
                >
                  시가 전체 토글
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHiddenAssetSeries((prev) => {
                      const next = { ...prev };
                      const principalKeys = assetKeys.map(
                        (k) => `principal_${k}`
                      );
                      const allHidden =
                        principalKeys.length > 0 &&
                        principalKeys.every((k) => next[k]);
                      const nextHidden = !allHidden;
                      principalKeys.forEach((k) => {
                        next[k] = nextHidden;
                      });
                      return next;
                    })
                  }
                  className="px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-100"
                >
                  원금 전체 토글
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {assetKeys.map((k, i) => {
                  const valueKey = `value_${k}`;
                  const principalKey = `principal_${k}`;
                  const color = colors[i % colors.length];
                  const isValueHidden = !!hiddenAssetSeries[valueKey];
                  const isPrincipalHidden =
                    !!hiddenAssetSeries[principalKey];
                  return (
                    <div
                      key={k}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setHiddenAssetSeries((prev) => ({
                            ...prev,
                            [valueKey]: !prev[valueKey],
                          }))
                        }
                        className={`flex items-center gap-1 ${
                          isValueHidden ? 'opacity-40' : 'opacity-100'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span>{names[k]} 시가</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHiddenAssetSeries((prev) => ({
                            ...prev,
                            [principalKey]: !prev[principalKey],
                          }))
                        }
                        className={`flex items-center gap-1 ${
                          isPrincipalHidden
                            ? 'opacity-40'
                            : 'opacity-100'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: darkMode
                              ? '#64748b'
                              : '#cbd5f5',
                          }}
                        />
                        <span>{names[k]} 원금</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-[260px] mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartHistory}
                  margin={{ top: 4, right: 60, left: 0, bottom: 4 }}
                >
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
                    formatter={(v: number) => formatNum(v) + '원'}
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
                  {assetKeys.map((k, i) => (
                    <React.Fragment key={k}>
                      <Line
                        type="monotone"
                        dataKey={`value_${k}`}
                        name={`${names[k]} 시가`}
                        stroke={colors[i % colors.length]}
                        strokeWidth={2.2}
                        dot={false}
                        hide={!!hiddenAssetSeries[`value_${k}`]}
                        isAnimationActive={false}
                      >
                        <LabelList
                          content={(props) =>
                            renderAssetEndLabel(
                              props,
                              names[k],
                              lastIndex,
                              darkMode
                            )
                          }
                        />
                      </Line>
                      <Line
                        type="monotone"
                        dataKey={`principal_${k}`}
                        name={`${names[k]} 원금`}
                        stroke={darkMode ? '#64748b' : '#cbd5f5'}
                        strokeDasharray="4 2"
                        strokeWidth={1.6}
                        dot={false}
                        hide={!!hiddenAssetSeries[`principal_${k}`]}
                        isAnimationActive={false}
                      />
                    </React.Fragment>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
