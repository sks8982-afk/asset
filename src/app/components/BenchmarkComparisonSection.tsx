'use client';

import React, { useState } from 'react';
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
import { BarChart3, ChevronDown, ChevronUp, Trophy, TrendingDown } from 'lucide-react';
import type { BenchmarkPoint, BenchmarkResult } from '@/lib/types';
import { BENCHMARKS } from '@/lib/utils';

type BenchmarkComparisonSectionProps = {
  points: BenchmarkPoint[];
  results: BenchmarkResult[];
  formatNum: (n: number) => string;
  darkMode: boolean;
};

const MY_PORTFOLIO_COLOR = '#0f172a';
const PRINCIPAL_COLOR = '#94a3b8';

export function BenchmarkComparisonSection({
  points,
  results,
  formatNum,
  darkMode,
}: BenchmarkComparisonSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});

  if (points.length < 2) return null;

  const myResult = results.find((r) => r.key === 'myPortfolio');
  const bestResult = results[0];
  const myRank = results.findIndex((r) => r.key === 'myPortfolio') + 1;

  const toggleLine = (key: string) => {
    setHiddenLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 차트 Y축 포맷 (만원 단위)
  const formatYAxis = (v: number) => {
    if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
    return formatNum(v);
  };

  // 툴팁 포맷
  const formatTooltipValue = (v: number) => `${formatNum(v)}원`;

  return (
    <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-xl">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={24} />
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            벤치마크 대비 수익률
          </h2>
          {myResult && (
            <span className={`text-sm font-black px-3 py-1 rounded-full ${
              myRank === 1
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : myRank <= 3
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {myRank === 1 ? '🏆' : `${myRank}위`} / {results.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {myResult && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase">내 수익률</p>
              <p className={`text-2xl font-black ${myResult.totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {myResult.totalReturn >= 0 ? '+' : ''}{myResult.totalReturn.toFixed(1)}%
              </p>
            </div>
          )}
          {expanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </div>
      </div>

      {/* 성과 요약 카드 (항상 표시) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {results.map((r, idx) => {
          const isMe = r.key === 'myPortfolio';
          const isTop = idx === 0;
          return (
            <div
              key={r.key}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                isMe
                  ? 'bg-slate-900 dark:bg-slate-700 border-slate-800 text-white ring-2 ring-indigo-400'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-600'
              } ${hiddenLines[r.key] ? 'opacity-40' : ''}`}
              onClick={() => !isMe && toggleLine(r.key)}
            >
              <div className="flex items-center gap-1 mb-1">
                {isTop && <Trophy size={12} className="text-amber-400" />}
                <p className={`text-[9px] font-black uppercase truncate ${
                  isMe ? 'text-indigo-300' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {r.label}
                </p>
              </div>
              <p className={`text-lg font-black ${
                isMe
                  ? 'text-white'
                  : r.totalReturn >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-500'
              }`}>
                {r.totalReturn >= 0 ? '+' : ''}{r.totalReturn.toFixed(1)}%
              </p>
              <p className={`text-[9px] font-bold ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
                {formatNum(r.finalValue)}원
              </p>
              {!isMe && (
                <div className="w-3 h-1 rounded-full mt-1" style={{ backgroundColor: r.color }} />
              )}
            </div>
          );
        })}
      </div>

      {/* 차이 요약 */}
      {myResult && bestResult && bestResult.key !== 'myPortfolio' && (
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
          <TrendingDown size={14} className="text-slate-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {bestResult.label}만 샀으면{' '}
            <span className="font-black text-rose-500">
              {formatNum(Math.abs(bestResult.finalValue - myResult.finalValue))}원
            </span>
            {bestResult.finalValue > myResult.finalValue ? ' 더 벌었을 것' : ' 덜 벌었을 것'}
            {' '}({(bestResult.totalReturn - myResult.totalReturn).toFixed(1)}%p 차이)
          </p>
        </div>
      )}

      {/* 차트 (펼치기) */}
      {expanded && (
        <div className="mt-6">
          <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">
            같은 금액 · 같은 시점 입금 기준 가상 비교
          </p>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={points}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={darkMode ? '#334155' : '#e2e8f0'}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip
                  contentStyle={{
                    background: darkMode ? '#1e293b' : '#fff',
                    border: '1px solid ' + (darkMode ? '#334155' : '#e2e8f0'),
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                  formatter={(value: unknown, name: unknown) => {
                    const v = Number(value ?? 0);
                    const n = String(name ?? '');
                    const label =
                      n === 'myPortfolio' ? '내 포트폴리오'
                      : n === 'principal' ? '누적 원금'
                      : BENCHMARKS.find((b) => b.key === n)?.label ?? n;
                    return [formatTooltipValue(v), label];
                  }}
                />
                <Legend
                  iconType="plainline"
                  formatter={(value: string) => {
                    if (value === 'myPortfolio') return '내 포트폴리오';
                    if (value === 'principal') return '누적 원금';
                    return BENCHMARKS.find((b) => b.key === value)?.label ?? value;
                  }}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 700 }}
                />

                {/* 누적 원금 (점선) */}
                <Line
                  type="monotone"
                  dataKey="principal"
                  stroke={PRINCIPAL_COLOR}
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  dot={false}
                  hide={hiddenLines['principal']}
                />

                {/* 내 포트폴리오 (굵은 실선) */}
                <Line
                  type="monotone"
                  dataKey="myPortfolio"
                  stroke={darkMode ? '#e2e8f0' : MY_PORTFOLIO_COLOR}
                  strokeWidth={3}
                  dot={false}
                />

                {/* 벤치마크 라인들 */}
                {BENCHMARKS.map((bm) => (
                  <Line
                    key={bm.key}
                    type="monotone"
                    dataKey={bm.key}
                    stroke={bm.color}
                    strokeWidth={1.5}
                    dot={false}
                    hide={hiddenLines[bm.key]}
                    strokeOpacity={0.8}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl text-[10px] text-slate-500 space-y-1">
            <p className="font-black text-slate-600 dark:text-slate-400">📊 벤치마크 비교 방식</p>
            <p>• 실제 입금한 날짜와 금액 그대로, 해당 월에 벤치마크만 매수했을 경우를 시뮬레이션</p>
            <p>• 매수 수수료, 세금, 환전 비용 미반영 (실제보다 벤치마크가 유리하게 계산됨)</p>
            <p>• S&P/나스닥/KODEX는 국내 상장 ETF 가격 기준 (원화, 환헷지 효과 포함)</p>
            <p>• 카드를 클릭하면 해당 라인을 숨기거나 표시할 수 있습니다</p>
          </div>
        </div>
      )}
    </section>
  );
}
