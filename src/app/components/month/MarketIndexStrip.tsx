import React from 'react';
import { indexStripItems, type MarketIndices } from '@/lib/market';
import { Card } from '../ui/Card';

type MarketIndexStripProps = {
  /** 주요 지수 — 시장 정보라 수익률 숨기기와 무관하게 보인다 (없으면 카드를 그리지 않는다) */
  indices: MarketIndices | null;
};

const DIRECTION = {
  up: { arrow: '▲', label: '상승', tone: 'text-emerald-600 dark:text-emerald-400' },
  down: { arrow: '▼', label: '하락', tone: 'text-rose-600 dark:text-rose-400' },
  flat: { arrow: '', label: '보합', tone: 'text-slate-600 dark:text-slate-300' },
} as const;

/** 주요 지수 — KOSPI · S&P500 · 나스닥의 지수와 전일 종가 대비 등락률 ('내 자산' 카드 위) */
export function MarketIndexStrip({ indices }: MarketIndexStripProps) {
  const items = indexStripItems(indices);
  if (items.length === 0) return null;

  return (
    <Card className="p-3 sm:p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <h2 className="font-semibold">주요 지수</h2>
        <span>전일 대비</span>
      </div>
      {/* 일부 지수만 받아 왔어도 칸이 비지 않도록 받은 개수만큼 나눈다 */}
      <ul
        className="grid divide-x divide-slate-100 dark:divide-slate-700/60"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const d = DIRECTION[item.direction];
          return (
            <li key={item.key} className="min-w-0 px-3 first:pl-0 last:pr-0">
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{item.price}</p>
              <p className={`text-xs font-semibold tabular-nums ${d.tone}`}>
                <span aria-hidden="true">{d.arrow}</span>
                <span className="sr-only">{d.label} </span>
                {item.changePct}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
