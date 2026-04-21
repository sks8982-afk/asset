'use client';

import React, { useMemo } from 'react';
import { AlertOctagon, TrendingUp } from 'lucide-react';
import type { InvestmentRecord } from '@/lib/types';

type TradingFrequencyMonitorProps = {
  records: InvestmentRecord[];
};

/**
 * 거래 빈도 모니터.
 * Barber & Odean (2000) 연구: 자주 거래하는 개인투자자는 덜 거래하는 투자자보다 연 ~6% 덜 번다.
 * 연간 매매 회수 경고.
 */
export function TradingFrequencyMonitor({
  records,
}: TradingFrequencyMonitorProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const recent = records.filter((r) => new Date(r.date) >= yearAgo);
    const buyCount = recent.filter((r) => r.type !== 'sell').length;
    const sellCount = recent.filter((r) => r.type === 'sell').length;
    const totalTrades = buyCount + sellCount;

    // 최근 30일
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const recent30 = records.filter((r) => new Date(r.date) >= monthAgo);

    // 평가
    let level: 'good' | 'medium' | 'bad' = 'good';
    let message = '';
    if (sellCount >= 6) {
      level = 'bad';
      message = `연 매도 ${sellCount}회 — 과다거래. Barber-Odean 연구: 연 수익률 -6% 예상`;
    } else if (sellCount >= 3) {
      level = 'medium';
      message = `연 매도 ${sellCount}회 — 주의. 분기 1회 이내 권장`;
    } else if (recent30.filter((r) => r.type === 'sell').length >= 2) {
      level = 'medium';
      message = '최근 30일 매도 2회+ — 감정 개입 의심';
    } else {
      level = 'good';
      message = '거래 빈도 정상 — 장기 투자자 수준';
    }

    return { buyCount, sellCount, totalTrades, level, message };
  }, [records]);

  if (stats.totalTrades === 0) return null;

  const bg =
    stats.level === 'bad' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700'
    : stats.level === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
    : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700';

  const Icon = stats.level === 'good' ? TrendingUp : AlertOctagon;
  const iconColor =
    stats.level === 'bad' ? 'text-rose-600'
    : stats.level === 'medium' ? 'text-amber-600'
    : 'text-emerald-600';

  return (
    <section className={`rounded-3xl border p-4 ${bg}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className="text-xs font-black text-slate-900 dark:text-slate-100">
            거래 빈도 (최근 1년): 매수 {stats.buyCount}회 · 매도 {stats.sellCount}회
          </p>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">
            {stats.message}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
            📚 Barber-Odean(2000): 가장 자주 거래하는 그룹은 가장 덜 거래하는 그룹보다 연 수익률 6%p 낮음
          </p>
        </div>
      </div>
    </section>
  );
}
