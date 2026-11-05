'use client';

import React, { useId, useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, ChevronDown } from 'lucide-react';
import type { BenchmarkPoint, BenchmarkResult } from '@/lib/types';
import { BENCHMARKS } from '@/lib/benchmark';
import { formatSignedPercent } from '@/lib/utils';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { PANEL_CLASS, signToneClass } from './ui/styles';

type BenchmarkComparisonSectionProps = {
  points: BenchmarkPoint[];
  results: BenchmarkResult[];
  formatNum: (n: number) => string;
  darkMode: boolean;
};

const PRINCIPAL_COLOR = '#94a3b8';

function lineLabel(key: string): string {
  if (key === 'myPortfolio') return '내 포트폴리오';
  if (key === 'principal') return '누적 원금';
  return BENCHMARKS.find((b) => b.key === key)?.label ?? key;
}

/** 만원 단위 축 */
function axisWon(v: number, formatNum: (n: number) => string): string {
  return v >= 10_000 ? `${(v / 10_000).toFixed(0)}만` : formatNum(v);
}

type ResultRowProps = {
  result: BenchmarkResult;
  color: string;
  isMe: boolean;
  formatNum: (n: number) => string;
};

function ResultRow({ result, color, isMe, formatNum }: ResultRowProps) {
  return (
    <span className="flex items-center gap-3">
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${isMe ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>
          {result.label}
        </span>
        <span className="block text-xs tabular-nums text-slate-500 dark:text-slate-400">{formatNum(result.finalValue)}원</span>
      </span>
      <span className={`shrink-0 text-base font-bold tabular-nums ${signToneClass(result.totalReturn)}`}>
        {formatSignedPercent(result.totalReturn)}
      </span>
    </span>
  );
}

/** 같은 날 같은 금액을 S&P500만 / 70:30에 넣었다면 — 내 포트폴리오와 비교 */
export function BenchmarkComparisonSection({ points, results, formatNum, darkMode }: BenchmarkComparisonSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});
  const chartId = useId();

  if (points.length === 0 || results.length === 0) return null;

  const myResult = results.find((r) => r.key === 'myPortfolio');
  const best = results[0];
  const myRank = results.findIndex((r) => r.key === 'myPortfolio') + 1;
  const myColor = darkMode ? '#e2e8f0' : '#0f172a';
  const tick = { fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' };
  const toggleLine = (key: string) => setHiddenLines((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <Card
      title="S&P500만 샀다면?"
      subtitle="같은 날 같은 금액을 S&P500 또는 70:30에 넣었을 때"
      icon={<BarChart3 size={18} />}
      actions={myRank > 0 ? <Badge tone={myRank === 1 ? 'emerald' : 'neutral'}>{myRank}위 / {results.length}</Badge> : undefined}
    >
      <ul className="space-y-2">
        {results.map((r) => {
          const isMe = r.key === 'myPortfolio';
          const row = <ResultRow result={r} color={isMe ? myColor : r.color} isMe={isMe} formatNum={formatNum} />;
          const box = `block w-full rounded-xl border px-3 py-2 text-left ${
            isMe
              ? 'border-blue-200 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-700'
          }`;
          return (
            <li key={r.key}>
              {expanded && !isMe ? (
                <button
                  type="button"
                  aria-pressed={!hiddenLines[r.key]}
                  onClick={() => toggleLine(r.key)}
                  className={`${box} transition-opacity hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-slate-700/40 ${hiddenLines[r.key] ? 'opacity-40' : ''}`}
                >
                  {row}
                </button>
              ) : (
                <div className={box}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>

      {myResult && best.key !== 'myPortfolio' && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {best.label}이었다면{' '}
          <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {formatNum(Math.abs(best.finalValue - myResult.finalValue))}원
          </span>
          {best.finalValue > myResult.finalValue ? ' 더 벌었을 것' : ' 덜 벌었을 것'}
          <span className="tabular-nums"> ({(best.totalReturn - myResult.totalReturn).toFixed(1)}%p 차이)</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={expanded ? chartId : undefined}
        className="mt-4 inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-slate-100"
      >
        {expanded ? '차트 접기' : '차트 보기'}
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div id={chartId} className="mt-3">
          <div className="h-72 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" tick={tick} tickLine={false} padding={{ left: 16, right: 16 }} />
                <YAxis tickFormatter={(v: number) => axisWon(v, formatNum)} tick={tick} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  contentStyle={{
                    background: darkMode ? '#0f172a' : '#ffffff',
                    border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                    borderRadius: 12,
                    fontSize: 11,
                    color: darkMode ? '#e2e8f0' : '#0f172a',
                  }}
                  formatter={(value: unknown, name: unknown) => [`${formatNum(Number(value ?? 0))}원`, lineLabel(String(name ?? ''))]}
                />
                <Legend iconType="plainline" formatter={(value: string) => lineLabel(value)} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                <Line type="monotone" dataKey="principal" stroke={PRINCIPAL_COLOR} strokeDasharray="6 3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="myPortfolio" stroke={myColor} strokeWidth={3} dot={false} isAnimationActive={false} />
                {BENCHMARKS.map((bm) => (
                  <Line key={bm.key} type="monotone" dataKey={bm.key} stroke={bm.color} strokeWidth={1.5} dot={false} hide={hiddenLines[bm.key]} strokeOpacity={0.85} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={`mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400 ${PANEL_CLASS}`}>
            <p className="font-semibold text-slate-700 dark:text-slate-300">비교 방식</p>
            <p>실제 입금한 날짜와 금액 그대로, 그달에 비교 대상만 샀다고 계산합니다.</p>
            <p>매수 수수료·세금·환전 비용은 넣지 않았습니다 (비교 대상이 실제보다 유리하게 계산됩니다).</p>
            <p>S&amp;P500·나스닥100은 국내 상장 환노출 ETF의 원화 시세를 씁니다.</p>
            <p>위 목록에서 비교 대상을 누르면 차트에서 그 선을 숨기거나 보입니다.</p>
          </div>
        </div>
      )}
    </Card>
  );
}
