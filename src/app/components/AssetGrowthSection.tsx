'use client';

import React, { useMemo, useState } from 'react';
import {
  CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { ChartDataPoint } from '@/lib/types';
import { ASSETS } from '@/lib/assets';
import { formatNum } from '@/lib/utils';
import { Card } from './ui/Card';
import { SegmentedControl } from './ui/SegmentedControl';

type View = 'total' | 'byAsset';

const VIEW_OPTIONS = [
  { value: 'total', label: '총합' },
  { value: 'byAsset', label: '종목별' },
] as const;

type AssetGrowthSectionProps = {
  chartHistory: ChartDataPoint[];
  darkMode: boolean;
};

type LabelListProps = { x?: number | string; y?: number | string; index?: number; value?: number | string | null };

function chartColors(darkMode: boolean) {
  return {
    grid: darkMode ? '#334155' : '#e2e8f0',
    tick: darkMode ? '#94a3b8' : '#64748b',
    total: darkMode ? '#60a5fa' : '#2563eb',
    principal: '#94a3b8',
    assetPrincipal: darkMode ? '#64748b' : '#cbd5e1',
    label: darkMode ? '#e2e8f0' : '#0f172a',
    tooltipBg: darkMode ? '#0f172a' : '#ffffff',
    tooltipBorder: darkMode ? '#334155' : '#e2e8f0',
    tooltipText: darkMode ? '#e2e8f0' : '#0f172a',
  };
}

type SeriesToggleProps = { color: string; dashed?: boolean; label: string; shown: boolean; onClick: () => void };

/** 선 하나를 숨기고 보이는 버튼 (선 모양 견본 + 이름) */
function SeriesToggle({ color, dashed = false, label, shown, onClick }: SeriesToggleProps) {
  const swatch = dashed ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` : color;
  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 transition-opacity hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-200 dark:hover:bg-slate-700 ${
        shown ? '' : 'opacity-40'
      }`}
    >
      <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: swatch }} aria-hidden="true" />
      {label}
    </button>
  );
}

const shortMonth = (v: string): string => String(v).slice(2, 7);

/** 자산 추이 — 월별 총자산·누적 원금 (실제 기록), 종목별 평가액·원금 */
export function AssetGrowthSection({ chartHistory, darkMode }: AssetGrowthSectionProps) {
  const [view, setView] = useState<View>('total');
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const colors = chartColors(darkMode);
  const lastIndex = chartHistory.length - 1;
  const toggle = (key: string) => setHidden((prev) => ({ ...prev, [key]: !prev[key] }));

  /** 한 번이라도 보유한 종목만 (값이 모두 0인 선은 그리지 않는다) */
  const assets = useMemo(
    () => ASSETS.filter((a) => chartHistory.some((p) => Number(p[`value_${a.key}`]) > 0 || Number(p[`principal_${a.key}`]) > 0)),
    [chartHistory],
  );

  const toggleAll = (prefix: 'value' | 'principal') => {
    const keys = assets.map((a) => `${prefix}_${a.key}`);
    setHidden((prev) => {
      const nextHidden = !keys.every((k) => prev[k]);
      return { ...prev, ...Object.fromEntries(keys.map((k) => [k, nextHidden])) };
    });
  };

  const axis = (
    <XAxis
      dataKey="date"
      fontSize={10}
      tick={{ fill: colors.tick }}
      axisLine={false}
      tickLine={false}
      tickFormatter={shortMonth}
      interval={2}
      padding={{ left: 16, right: 16 }}
    />
  );
  const tooltipBox = {
    backgroundColor: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 12,
    color: colors.tooltipText,
    fontSize: 11,
  };

  return (
    <Card
      title="자산 추이"
      subtitle="월말 기준 · 실제 기록"
      icon={<TrendingUp size={18} />}
      actions={<SegmentedControl label="보기" options={VIEW_OPTIONS} value={view} onChange={setView} />}
    >
      {view === 'total' ? (
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            <SeriesToggle color={colors.total} label="총자산" shown={!hidden.investment} onClick={() => toggle('investment')} />
            <SeriesToggle color={colors.principal} dashed label="누적 원금" shown={!hidden.principal} onClick={() => toggle('principal')} />
          </div>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartHistory} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                {axis}
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length || !label) return null;
                    const p = payload[0]?.payload as Partial<ChartDataPoint> | undefined;
                    const interest = Number(p?.cmaInterest ?? 0);
                    return (
                      <div style={tooltipBox} className="px-3 py-2 tabular-nums shadow-lg">
                        <p className="mb-1 font-bold">{label}</p>
                        <p>총자산 {formatNum(Number(p?.investment ?? 0))}원</p>
                        <p>원금 {formatNum(Number(p?.principal ?? 0))}원</p>
                        {interest > 0 && <p>CMA 누적 이자 {formatNum(interest)}원</p>}
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="investment" name="총자산" stroke={colors.total} strokeWidth={2.5} dot={{ r: 2 }} hide={!!hidden.investment} isAnimationActive={false} />
                <Line type="monotone" dataKey="principal" name="누적 원금" stroke={colors.principal} strokeWidth={2} strokeDasharray="6 4" dot={false} hide={!!hidden.principal} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => toggleAll('value')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              평가액 전체
            </button>
            <button type="button" onClick={() => toggleAll('principal')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              원금 전체
            </button>
          </div>
          <ul className="mb-2 flex flex-wrap gap-x-2 gap-y-1">
            {assets.map((a) => (
              <li key={a.key} className="flex flex-wrap items-center">
                <SeriesToggle color={a.color} label={a.name} shown={!hidden[`value_${a.key}`]} onClick={() => toggle(`value_${a.key}`)} />
                <SeriesToggle color={colors.assetPrincipal} dashed label="원금" shown={!hidden[`principal_${a.key}`]} onClick={() => toggle(`principal_${a.key}`)} />
              </li>
            ))}
          </ul>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartHistory} margin={{ top: 4, right: 56, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                {axis}
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(v) => (v != null ? `${formatNum(Number(v))}원` : '')}
                  contentStyle={tooltipBox}
                  labelStyle={{ color: colors.tooltipText, fontWeight: 700 }}
                />
                {assets.map((a) => (
                  <React.Fragment key={a.key}>
                    <Line type="monotone" dataKey={`value_${a.key}`} name={`${a.name} 평가액`} stroke={a.color} strokeWidth={2} dot={false} hide={!!hidden[`value_${a.key}`]} isAnimationActive={false}>
                      <LabelList
                        content={(props) => {
                          const { x, y, index, value } = props as LabelListProps;
                          if (index !== lastIndex || value == null || value === '') return null;
                          return (
                            <text x={Number(x) + 4} y={Number(y)} dy={3} fontSize={9} fill={colors.label}>
                              {a.name}
                            </text>
                          );
                        }}
                      />
                    </Line>
                    <Line type="monotone" dataKey={`principal_${a.key}`} name={`${a.name} 원금`} stroke={colors.assetPrincipal} strokeDasharray="4 2" strokeWidth={1.5} dot={false} hide={!!hidden[`principal_${a.key}`]} isAnimationActive={false} />
                  </React.Fragment>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}
