import React from 'react';
import { Layers } from 'lucide-react';

type HoldingsSummarySectionProps = {
  portfolio: Record<string, { qty: number; avg: number; weight?: number; val?: number }>;
  names: Record<string, string>;
  colors: string[];
  assetGroups: { label: string; keys: string[] }[];
  formatNum: (n: number) => string;
  formatDec: (n: number) => string;
  currentPriceMap: Record<string, number>;
};

export function HoldingsSummarySection({
  portfolio,
  names,
  colors,
  assetGroups,
  formatNum,
  formatDec,
  currentPriceMap,
}: HoldingsSummarySectionProps) {
  const keyToColorIndex: Record<string, number> = {};
  let idx = 0;
  assetGroups.forEach((g) => {
    g.keys.forEach((k) => {
      if (k !== 'cash') keyToColorIndex[k] = idx++;
    });
  });

  return (
    <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4 leading-none text-slate-700 dark:text-slate-200">
        <Layers size={18} />
        현재 보유 수량 · 평단
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="py-2 pr-4 text-left font-bold text-slate-400 dark:text-slate-500">
                종목
              </th>
              <th className="py-2 px-2 text-right font-bold text-slate-400 dark:text-slate-500">
                보유 수량
              </th>
              <th className="py-2 pl-2 text-right font-bold text-slate-400 dark:text-slate-500">
                현재시세 / 평단 / 투자금 / 수익률
              </th>
            </tr>
          </thead>
          <tbody>
            {assetGroups.map((group) => (
              <React.Fragment key={group.label}>
                <tr className="bg-slate-100/80 dark:bg-slate-700/40">
                  <td colSpan={3} className="py-1.5 px-2 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                    {group.label}
                  </td>
                </tr>
                {group.keys
                  .filter((k) => k !== 'cash')
                  .map((k) => {
                    const p = portfolio[k] ?? { qty: 0, avg: 0 };
                    return (
                      <tr
                        key={k}
                        className="border-b border-slate-50 dark:border-slate-800/80 last:border-b-0"
                      >
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-1.5 h-6 rounded-full"
                              style={{
                                backgroundColor: colors[keyToColorIndex[k] % colors.length],
                              }}
                            />
                            <span className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-100">
                              {names[k]}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {k === 'btc'
                              ? formatDec(p.qty)
                              : formatNum(p.qty)}
                          </span>
                          <span className="ml-1 text-[10px] text-slate-400">
                            주
                          </span>
                        </td>
                        <td className="py-2 pl-2 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              현재시세 {formatNum(Math.floor(currentPriceMap[k] ?? 0))}원
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              평단 {formatNum(Math.floor(p.avg))}원
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              투자금 {formatNum(Math.floor(p.avg * p.qty))}원
                            </span>
                            {p.qty > 0 && p.avg > 0 && currentPriceMap && (
                              <span
                                className={`text-[10px] font-bold ${
                                  (currentPriceMap[k] ?? 0) / p.avg - 1 >= 0
                                    ? 'text-blue-500'
                                    : 'text-rose-500'
                                }`}
                              >
                                수익률{' '}
                                {(
                                  ((currentPriceMap[k] ?? 0) / p.avg - 1 || 0) * 100
                                ).toFixed(1)}
                                %
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

