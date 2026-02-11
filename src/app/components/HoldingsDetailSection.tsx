'use client';

import React from 'react';
import { Layers } from 'lucide-react';

export type PortfolioItem = {
  qty: number;
  avg: number;
  val: number;
  roi: number;
};

type HoldingsDetailSectionProps = {
  portfolio: Record<string, PortfolioItem>;
  names: Record<string, string>;
  colors: string[];
  formatNum: (n: number) => string;
  formatDec: (n: number) => string;
  currentPriceMap: Record<string, number>;
};

export function HoldingsDetailSection({
  portfolio,
  names,
  colors,
  formatNum,
  formatDec,
  currentPriceMap,
}: HoldingsDetailSectionProps) {
  const assetKeys = Object.keys(names).filter((k) => k !== 'cash');

  return (
    <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
      <h2 className="text-sm font-black uppercase tracking-widest mb-6 leading-none flex items-center gap-2 text-slate-700 dark:text-slate-200">
        <Layers size={18} />
        보유 종목 상세
      </h2>
      <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
        {assetKeys.map((k, i) => {
          const p = portfolio[k];
          if (!p) return null;
          return (
            <div
              key={k}
              className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-none">
                    {names[k]}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">
                      {k === 'btc' ? formatDec(p.qty) : formatNum(p.qty)} 주
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      평단: {formatNum(Math.floor(p.avg))}원
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none mb-1">
                  {formatNum(Math.floor(p.val))}원
                </p>
                <p
                  className={`text-[10px] font-bold ${
                    p.roi >= 0 ? 'text-blue-500' : 'text-rose-500'
                  }`}
                >
                  {p.roi.toFixed(1)}% {p.roi >= 0 ? '▲' : '▼'}
                </p>
                {p.qty > 0 && p.avg > 0 && (
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    현재가 대비{' '}
                    {((currentPriceMap[k] / p.avg - 1 || 0) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
