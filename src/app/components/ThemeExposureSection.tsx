'use client';

import React, { useMemo, useState } from 'react';
import { Layers, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

type ThemeExposureSectionProps = {
  portfolio: Record<string, { val: number; weight: number; qty: number }>;
  totalAsset: number;
};

/**
 * 테마·지역·요인별 실제 노출도 분석.
 * 개별 ETF 비중이 아닌 "실제 테크 노출", "실제 미국 노출" 계산.
 *
 * 예: tech10 + nasdaq + semiconductor_top10 = 사실상 테크에 70%+ 몰빵 가능.
 */

// 각 자산의 테마별 가중치 (합 100%)
const ASSET_THEME_WEIGHTS: Record<string, Record<string, number>> = {
  tech10:              { tech: 0.95, usa: 1.0, largecap: 0.9 },
  nasdaq:              { tech: 0.55, usa: 1.0, largecap: 0.9 },
  snp:                 { tech: 0.28, usa: 1.0, largecap: 1.0 },
  kodex200:            { korea: 1.0, largecap: 1.0, tech: 0.30 },
  kodex_kosdaq150:     { korea: 1.0, smallcap: 0.8, tech: 0.45, biotech: 0.20 },
  semiconductor_top10: { tech: 1.0, semi: 1.0, korea: 0.4, usa: 0.4 },
  samsung:             { korea: 1.0, tech: 1.0, semi: 1.0, largecap: 1.0, singlestock: 1.0 },
  gold:                { commodity: 1.0, safehaven: 1.0 },
  btc:                 { crypto: 1.0, highrisk: 1.0 },
  cash:                { cash: 1.0, safehaven: 1.0 },
};

const THEME_LABELS: Record<string, string> = {
  tech: '테크',
  semi: '반도체',
  usa: '미국',
  korea: '한국',
  largecap: '대형주',
  smallcap: '소형주',
  biotech: '바이오',
  commodity: '원자재',
  safehaven: '안전자산',
  crypto: '암호화폐',
  highrisk: '고위험',
  singlestock: '개별종목',
  cash: '현금',
};

const THEME_WARNINGS: { theme: string; threshold: number; message: string }[] = [
  { theme: 'tech',        threshold: 50, message: '테크 50%↑ — 닷컴 버블 수준' },
  { theme: 'semi',        threshold: 30, message: '반도체 30%↑ — 사이클 리스크 큼' },
  { theme: 'korea',       threshold: 40, message: '한국 40%↑ — Home Bias 주의' },
  { theme: 'usa',         threshold: 70, message: '미국 70%↑ — 환율 리스크' },
  { theme: 'singlestock', threshold: 15, message: '개별종목 15%↑ — 분산 실패 위험' },
  { theme: 'crypto',      threshold: 15, message: '암호화폐 15%↑ — 투기적 비중 과다' },
];

export function ThemeExposureSection({
  portfolio,
  totalAsset,
}: ThemeExposureSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const { themes, warnings } = useMemo(() => {
    if (totalAsset <= 0) return { themes: [], warnings: [] };

    const exposure: Record<string, number> = {};

    for (const [key, pos] of Object.entries(portfolio)) {
      if (pos.val <= 0) continue;
      const weights = ASSET_THEME_WEIGHTS[key] ?? {};
      for (const [theme, w] of Object.entries(weights)) {
        const contribution = (pos.val / totalAsset) * 100 * w;
        exposure[theme] = (exposure[theme] ?? 0) + contribution;
      }
    }

    const themes = Object.entries(exposure)
      .map(([key, pct]) => ({ key, label: THEME_LABELS[key] ?? key, pct }))
      .sort((a, b) => b.pct - a.pct);

    const warnings: string[] = [];
    for (const w of THEME_WARNINGS) {
      const pct = exposure[w.theme] ?? 0;
      if (pct >= w.threshold) {
        warnings.push(`${w.message} (현재 ${pct.toFixed(1)}%)`);
      }
    }

    return { themes, warnings };
  }, [portfolio, totalAsset]);

  if (themes.length === 0) return null;

  return (
    <section className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            실제 테마·지역 노출 분석
          </h3>
          {warnings.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
              ⚠️ {warnings.length}개 경고
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      {/* 항상 보이는 상위 5개 */}
      <div className="mt-3 space-y-1.5">
        {themes.slice(0, 5).map((t) => {
          const warnThreshold = THEME_WARNINGS.find((w) => w.theme === t.key)?.threshold ?? 999;
          const isWarning = t.pct >= warnThreshold;
          return (
            <div key={t.key}>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className={`font-bold ${isWarning ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  {t.label}
                  {isWarning && <AlertTriangle size={10} className="inline ml-1" />}
                </span>
                <span className={`font-black ${isWarning ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                  {t.pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isWarning
                      ? 'bg-gradient-to-r from-rose-400 to-rose-600'
                      : 'bg-gradient-to-r from-indigo-400 to-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, t.pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700">
          {warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-rose-700 dark:text-rose-300 font-bold">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase">전체 노출</p>
          {themes.map((t) => (
            <div key={t.key} className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70">
              <span className="font-bold">{t.label}</span>
              <span className="font-black">{t.pct.toFixed(2)}%</span>
            </div>
          ))}
          <p className="text-[10px] text-slate-400 pt-2 leading-relaxed">
            ※ ETF마다 보유 종목 구성을 추정하여 계산한 값입니다.
            실제 정확한 비중은 각 ETF의 구성종목표(PDF)를 확인하세요.
          </p>
        </div>
      )}
    </section>
  );
}
