import React from 'react';
import { Info } from 'lucide-react';
import type { CoreGroup } from '@/lib/assets';
import { isMarketDip } from '@/lib/monthly';
import { Card } from '../ui/Card';

type MarketDipCardProps = {
  /** 묶음별 최근 12개월 고점 대비 낙폭 (%) */
  dips: Record<CoreGroup, number>;
};

function formatDrop(pct: number): string {
  return pct >= 0.05 ? `-${pct.toFixed(1)}%` : '0%';
}

/** 하락장 안내 — S&P500·나스닥100 중 하나라도 고점 대비 10% 이상 내려왔을 때만 */
export function MarketDipCard({ dips }: MarketDipCardProps) {
  if (!isMarketDip(dips)) return null;
  return (
    <Card
      title="시장이 고점보다 내려와 있습니다"
      icon={<Info size={18} className="text-amber-600 dark:text-amber-400" />}
      className="border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20"
    >
      <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
        S&amp;P500 {formatDrop(dips.sp500)} · 나스닥100 {formatDrop(dips.nasdaq100)}
        <span className="font-normal text-slate-500 dark:text-slate-400"> (원화 기준, 최근 12개월 고점 대비)</span>
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        이 정도 조정은 흔합니다. 할 일은 평소대로 이번 달 금액을 사는 것뿐입니다. 비상금은 건드리지 않습니다.
      </p>
    </Card>
  );
}
