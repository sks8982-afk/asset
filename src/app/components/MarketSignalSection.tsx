'use client';

import React, { useState } from 'react';
import { Activity, TrendingDown, ChevronDown, ChevronUp, RefreshCcw } from 'lucide-react';
import type { MarketSignal, SignalLevel } from '@/lib/types';
import { getSignalLabel, getAssetRiskProfile } from '@/lib/utils';

type IndexData = { price: number; change: number; changePct: number };

type MarketSignalSectionProps = {
  signal: MarketSignal;
  names: Record<string, string>;
  formatNum: (n: number) => string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  indices?: Record<string, IndexData>;
};

const INDEX_LABELS: Record<string, string> = {
  kospi: 'KOSPI',
  kosdaq: 'KOSDAQ',
  sp500: 'S&P 500',
  nasdaq_idx: 'NASDAQ',
  dow: 'DOW',
};

const LEVEL_STYLES: Record<SignalLevel, { bg: string; border: string; text: string; glow: string }> = {
  normal:      { bg: 'bg-emerald-50 dark:bg-emerald-900/20',  border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300', glow: '' },
  watch:       { bg: 'bg-blue-50 dark:bg-blue-900/20',        border: 'border-blue-200 dark:border-blue-700',       text: 'text-blue-700 dark:text-blue-300',       glow: '' },
  opportunity: { bg: 'bg-amber-50 dark:bg-amber-900/20',      border: 'border-amber-200 dark:border-amber-700',     text: 'text-amber-700 dark:text-amber-300',     glow: 'ring-2 ring-amber-300 dark:ring-amber-600' },
  strong_buy:  { bg: 'bg-orange-50 dark:bg-orange-900/20',    border: 'border-orange-300 dark:border-orange-600',   text: 'text-orange-700 dark:text-orange-300',   glow: 'ring-2 ring-orange-400 dark:ring-orange-500 animate-pulse' },
  all_in:      { bg: 'bg-rose-50 dark:bg-rose-900/20',        border: 'border-rose-300 dark:border-rose-600',       text: 'text-rose-700 dark:text-rose-300',       glow: 'ring-2 ring-rose-400 dark:ring-rose-500 animate-pulse' },
};

const SCORE_BAR_COLOR: Record<SignalLevel, string> = {
  normal:      'bg-emerald-400',
  watch:       'bg-blue-400',
  opportunity: 'bg-amber-400',
  strong_buy:  'bg-orange-500',
  all_in:      'bg-rose-500',
};

export function MarketSignalSection({ signal, names, formatNum, onRefresh, isRefreshing, indices }: MarketSignalSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const style = LEVEL_STYLES[signal.overallLevel];

  const sortedAssets = Object.values(signal.assetSignals)
    .sort((a, b) => b.score - a.score);

  return (
    <section className={`${style.bg} ${style.border} ${style.glow} p-6 sm:p-8 rounded-[3rem] border shadow-xl transition-all`}>
      {/* 헤더: 종합 시그널 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Activity className={style.text} size={24} />
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            매수 시그널
          </h2>
          <span className={`text-lg font-black ${style.text}`}>
            {getSignalLabel(signal.overallLevel)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 transition-all disabled:opacity-50 shadow-sm"
              title="시세 새로고침"
            >
              <RefreshCcw size={16} className={`text-slate-500 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">종합 점수</p>
            <p className={`text-3xl font-black ${style.text}`}>{signal.overallScore}</p>
          </div>
          {signal.overallMultiplier > 1 && (
            <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-md">
              <p className="text-[10px] font-bold text-slate-400 uppercase">매수 배율</p>
              <p className={`text-2xl font-black ${style.text}`}>×{signal.overallMultiplier.toFixed(1)}</p>
            </div>
          )}
        </div>
      </div>

      {/* 주요 지수 현황 */}
      {indices && Object.keys(indices).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(INDEX_LABELS).map(([key, label]) => {
            const idx = indices[key];
            if (!idx) return null;
            const isUp = idx.changePct >= 0;
            return (
              <div
                key={key}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600"
              >
                <span className="text-[10px] font-black text-slate-400">{label}</span>
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                  {idx.price >= 1000 ? idx.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : idx.price.toFixed(2)}
                </span>
                <span className={`text-[10px] font-bold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isUp ? '▲' : '▼'}{Math.abs(idx.changePct).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 종합 시그널 바 */}
      <div className="mb-6">
        <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
          <span>정상</span>
          <span>관심</span>
          <span>매수기회</span>
          <span>적극매수</span>
          <span>올인</span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${SCORE_BAR_COLOR[signal.overallLevel]}`}
            style={{ width: `${signal.overallScore}%` }}
          />
          {/* 구간 구분선 */}
          {[16, 36, 56, 76].map((threshold) => (
            <div
              key={threshold}
              className="absolute top-0 w-px h-full bg-white/50 dark:bg-slate-600"
              style={{ left: `${threshold}%` }}
            />
          ))}
        </div>
      </div>

      {/* 시그널 이유 */}
      {signal.reasons.length > 0 && (
        <div className="mb-6 space-y-1">
          {signal.reasons.map((reason, i) => (
            <p key={i} className={`text-sm font-bold ${style.text}`}>
              • {reason}
            </p>
          ))}
        </div>
      )}

      {/* 자산별 시그널 요약 (항상 표시) */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
        {sortedAssets.map((s) => {
          const assetStyle = LEVEL_STYLES[s.level];
          const profile = getAssetRiskProfile(s.key);
          return (
            <div
              key={s.key}
              className={`${assetStyle.bg} ${assetStyle.border} border rounded-2xl p-3 text-center`}
            >
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase truncate">
                {names[s.key] ?? s.key}
              </p>
              <p className={`text-xl font-black ${assetStyle.text}`}>{s.score}</p>
              <div className="flex items-center justify-center gap-1">
                <p className="text-[9px] font-bold text-slate-400">
                  {s.drawdownFromPeak > 0 ? `↓${s.drawdownFromPeak.toFixed(1)}%` : '-'}
                </p>
                {profile.scoreCap < 100 && (
                  <span className="text-[8px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-600 px-1 rounded">
                    상한{profile.scoreCap}
                  </span>
                )}
              </div>
              <p className="text-[8px] font-bold text-slate-300 dark:text-slate-600 mt-0.5">
                {profile.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* 상세 펼치기 토글 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mx-auto"
      >
        {expanded ? '접기' : '상세 분석 보기'}
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* 상세 테이블 */}
      {expanded && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-200 dark:border-slate-600">
                <th className="text-left py-2 px-2">종목</th>
                <th className="text-center py-2 px-2">유형</th>
                <th className="text-center py-2 px-2">점수</th>
                <th className="text-center py-2 px-2">레벨</th>
                <th className="text-center py-2 px-2">고점대비</th>
                <th className="text-center py-2 px-2">6M MA</th>
                <th className="text-center py-2 px-2">12M MA</th>
                <th className="text-center py-2 px-2">연속하락</th>
                <th className="text-left py-2 px-2">시그널 근거</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map((s) => {
                const assetStyle = LEVEL_STYLES[s.level];
                const prof = getAssetRiskProfile(s.key);
                return (
                  <tr key={s.key} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-2 px-2 font-bold text-slate-700 dark:text-slate-300">
                      {names[s.key] ?? s.key}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {prof.label}
                      </span>
                    </td>
                    <td className={`py-2 px-2 text-center font-black ${assetStyle.text}`}>
                      {s.score}{prof.scoreCap < 100 ? `/${prof.scoreCap}` : ''}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`${assetStyle.text} font-bold text-[10px]`}>
                        {getSignalLabel(s.level)}
                      </span>
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${s.drawdownFromPeak >= 10 ? 'text-rose-500' : 'text-slate-500'}`}>
                      {s.drawdownFromPeak > 0 ? `-${s.drawdownFromPeak.toFixed(1)}%` : '-'}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${s.maBelowPct6 > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {s.maBelowPct6 > 0 ? `-${s.maBelowPct6.toFixed(1)}%` : `+${Math.abs(s.maBelowPct6).toFixed(1)}%`}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${s.maBelowPct12 > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {s.maBelowPct12 > 0 ? `-${s.maBelowPct12.toFixed(1)}%` : `+${Math.abs(s.maBelowPct12).toFixed(1)}%`}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${s.consecutiveDeclines >= 3 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {s.consecutiveDeclines > 0 ? `${s.consecutiveDeclines}개월` : '-'}
                    </td>
                    <td className="py-2 px-2 text-slate-500 dark:text-slate-400">
                      {s.reasons.length > 0 ? s.reasons.join(', ') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 시그널 계산 방식 안내 */}
          <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl text-[10px] text-slate-500 space-y-1">
            <p className="font-black text-slate-600 dark:text-slate-400">📊 시그널 채점 기준 (30년 백테스팅 기반, 자산별 차등)</p>
            <p>• <b>고점 대비 낙폭</b> (0~55점): 12개월 고점 대비 — 자산별 임계값 상이 (S&P -20%=급락, BTC -20%=일상)</p>
            <p>• <b>이동평균 괴리</b> (0~25점): 6M/12M 평균 대비 — 변동성 높은 자산은 기준 완화</p>
            <p>• <b>연속 하락 모멘텀</b> (0~15점): 자산별 최소 기준 (지수 3개월, BTC 4개월)</p>
            <p>• <b>동시 하락 보너스</b> (+10점): 3개 이상 자산 동시 시그널 → 시스템 리스크 = 최적 매수</p>
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="font-black text-slate-600 dark:text-slate-400">🏷️ 자산 유형별 점수 상한</p>
              <p>• <b>지수 ETF</b> (S&P, KODEX): 100점 — 평균회귀 강함, 빠지면 사는 게 정석</p>
              <p>• <b>성장/테마</b> (나스닥, 테크, 반도체, 코스닥): 100점 — 변동성 큰 만큼 임계값 높게</p>
              <p>• <b>개별종목</b> (삼성전자): 90점 — 종목 고유 리스크 존재</p>
              <p>• <b>안전자산</b> (금): 85점 — 작은 하락도 의미 있지만 올인은 불필요</p>
              <p>• <b>암호화폐</b> (BTC): 75점 상한 — 극단적 변동성, 자동 올인 차단</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
