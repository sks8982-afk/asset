'use client';

import React from 'react';
import { Zap, X } from 'lucide-react';
import type { MarketSignal } from '@/lib/types';

type SignalAlertBannerProps = {
  signal: MarketSignal | null;
  thisMonthHasBuy: boolean;
  isPanicBuyMode: boolean;
  onDismiss: () => void;
};

/**
 * 시그널 점수가 높은데 이번 달 아직 매수 기록이 없을 때 경고.
 * 사용자가 감정적으로 매수를 미루는 것을 방지.
 */
export function SignalAlertBanner({
  signal,
  thisMonthHasBuy,
  isPanicBuyMode,
  onDismiss,
}: SignalAlertBannerProps) {
  if (!signal || isPanicBuyMode) return null;
  if (thisMonthHasBuy) return null;
  if (signal.overallScore < 56) return null;

  const level = signal.overallLevel;
  const label =
    level === 'all_in' ? '🔴 올인'
    : level === 'strong_buy' ? '🟠 적극매수'
    : '🟡 매수기회';

  const topAsset = Object.values(signal.assetSignals)
    .sort((a, b) => b.score - a.score)[0];

  return (
    <section className="bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/40 border-2 border-rose-400 dark:border-rose-700 rounded-3xl p-4 animate-pulse-slow">
      <div className="flex items-start gap-3">
        <Zap size={22} className="text-rose-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-black text-rose-900 dark:text-rose-100">
            {label} 시그널 ({signal.overallScore}점) — 이번 달 아직 매수 기록 없음
          </p>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
            규율대로라면 지금이 매수 타이밍입니다.
            {topAsset && ` 최고 시그널: ${topAsset.key} (${topAsset.score}점)`}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 text-rose-400 hover:text-rose-600 transition-colors"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>
    </section>
  );
}
