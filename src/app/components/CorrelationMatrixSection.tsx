'use client';

import React, { useMemo, useState } from 'react';
import { GitBranch, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { MarketDataPoint } from '@/lib/types';

type CorrelationMatrixSectionProps = {
  marketHistory: MarketDataPoint[];
  names: Record<string, string>;
  portfolio: Record<string, { qty: number }>;
};

/**
 * 자산 간 상관계수 매트릭스.
 * 상관계수 0.7+ 자산은 사실상 같은 자산으로 봐야 함 → 분산 효과 없음.
 * 진짜 분산인지 가짜 분산인지 판단.
 */
export function CorrelationMatrixSection({
  marketHistory,
  names,
  portfolio,
}: CorrelationMatrixSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const { matrix, keys, warnings } = useMemo(() => {
    if (marketHistory.length < 12) return { matrix: {}, keys: [], warnings: [] };

    // 보유 중인 자산만
    const ownedKeys = Object.entries(portfolio)
      .filter(([k, v]) => k !== 'cash' && v.qty > 0)
      .map(([k]) => k);

    if (ownedKeys.length < 2) return { matrix: {}, keys: [], warnings: [] };

    // 월별 수익률 계산
    const returns: Record<string, number[]> = {};
    for (const k of ownedKeys) {
      returns[k] = [];
      for (let i = 1; i < marketHistory.length; i++) {
        const prev = Number(marketHistory[i - 1][k]) || 0;
        const cur = Number(marketHistory[i][k]) || 0;
        if (prev > 0 && cur > 0) {
          returns[k].push((cur - prev) / prev);
        }
      }
    }

    // Pearson 상관계수
    const correlation = (a: number[], b: number[]) => {
      const n = Math.min(a.length, b.length);
      if (n < 3) return 0;
      const aa = a.slice(-n);
      const bb = b.slice(-n);
      const ma = aa.reduce((s, v) => s + v, 0) / n;
      const mb = bb.reduce((s, v) => s + v, 0) / n;
      let num = 0, da = 0, db = 0;
      for (let i = 0; i < n; i++) {
        const dx = aa[i] - ma;
        const dy = bb[i] - mb;
        num += dx * dy;
        da += dx * dx;
        db += dy * dy;
      }
      return da * db > 0 ? num / Math.sqrt(da * db) : 0;
    };

    const matrix: Record<string, Record<string, number>> = {};
    const warnings: { a: string; b: string; corr: number }[] = [];
    for (const a of ownedKeys) {
      matrix[a] = {};
      for (const b of ownedKeys) {
        const c = correlation(returns[a], returns[b]);
        matrix[a][b] = c;
        if (a < b && c > 0.7) {
          warnings.push({ a, b, corr: c });
        }
      }
    }

    warnings.sort((x, y) => y.corr - x.corr);

    return { matrix, keys: ownedKeys, warnings };
  }, [marketHistory, portfolio]);

  if (keys.length < 2) return null;

  const colorFor = (c: number) => {
    if (c >= 0.8) return 'bg-rose-500 text-white';
    if (c >= 0.6) return 'bg-rose-300 dark:bg-rose-700 text-slate-900 dark:text-slate-100';
    if (c >= 0.4) return 'bg-amber-200 dark:bg-amber-800 text-slate-900 dark:text-slate-100';
    if (c >= 0.2) return 'bg-emerald-200 dark:bg-emerald-800 text-slate-900 dark:text-slate-100';
    if (c >= -0.2) return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    return 'bg-blue-400 dark:bg-blue-700 text-white';
  };

  return (
    <section className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <GitBranch size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            상관계수 매트릭스 — 진짜 분산인가?
          </h3>
          {warnings.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
              {warnings.length}쌍 중복
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      {warnings.length > 0 && !expanded && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          ⚠️ {warnings[0].a}·{warnings[0].b} 등 {warnings.length}쌍이 상관계수 0.7↑ — 분산 효과 낮음
        </p>
      )}

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* 경고 목록 */}
          {warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700">
              <p className="text-xs font-black text-rose-700 dark:text-rose-300 mb-2">
                🚨 중복 노출 자산 (상관계수 0.7↑)
              </p>
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-rose-800 dark:text-rose-200">
                  • <b>{names[w.a] ?? w.a}</b> ↔ <b>{names[w.b] ?? w.b}</b> = {w.corr.toFixed(2)}
                </p>
              ))}
              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-2 leading-relaxed">
                같은 테마/국가 ETF 여러 개 보유하면 실제 분산 효과 없음.
                하나로 통합하고 다른 자산군(채권, 원자재 등)으로 분산하는 것을 고려하세요.
              </p>
            </div>
          )}

          {/* 매트릭스 */}
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="p-1"></th>
                  {keys.map((k) => (
                    <th key={k} className="p-1 text-slate-500 font-bold" title={names[k] ?? k}>
                      {k.slice(0, 4)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((r) => (
                  <tr key={r}>
                    <td className="p-1 text-right font-bold text-slate-500 pr-2" title={names[r] ?? r}>
                      {r.slice(0, 6)}
                    </td>
                    {keys.map((c) => {
                      const v = matrix[r]?.[c] ?? 0;
                      return (
                        <td
                          key={c}
                          className={`p-1 text-center font-bold ${colorFor(v)}`}
                          title={`${r} vs ${c}: ${v.toFixed(2)}`}
                        >
                          {v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
            <p>• <b className="text-rose-500">0.7↑</b>: 사실상 같은 자산 (분산 효과 없음)</p>
            <p>• <b className="text-amber-600">0.4~0.7</b>: 부분 상관 (일정 분산)</p>
            <p>• <b className="text-emerald-600">0.2~0.4</b>: 좋은 분산</p>
            <p>• <b className="text-blue-600">음수</b>: 헷지 효과 (금-주식 등)</p>
          </div>
          <Info size={10} className="inline text-slate-400" /> <span className="text-[10px] text-slate-400">최근 월별 시세 기준 피어슨 상관계수</span>
        </div>
      )}
    </section>
  );
}
