'use client';

import React from 'react';
import { Calculator, Save, RefreshCcw, Edit3 } from 'lucide-react';
import type { MarketSignal, SignalLevel } from '@/lib/types';
import { getSignalLabel } from '@/lib/utils';

type BudgetItem = { month_date: string };
type GuideItem = {
  qty: number;
  price: number;
  drop: number;
  spent: number;
  baseQty: number;
  extraQty: number;
  weightCapped?: boolean;
};

const SIGNAL_CARD_STYLES: Record<SignalLevel, string> = {
  normal:      '',
  watch:       '',
  opportunity: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 ring-1 ring-amber-300 dark:ring-amber-600',
  strong_buy:  'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-600 ring-2 ring-orange-300 dark:ring-orange-500',
  all_in:      'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 ring-2 ring-rose-300 dark:ring-rose-600',
};

export type BuyGuideSectionProps = {
  currentMonth: number;
  isPanicBuyMode: boolean;
  onSaveClick: () => void;
  isSaving: boolean;
  dbHistoryBudgets: BudgetItem[];
  guide: Record<string, GuideItem>;
  names: Record<string, string>;
  assetGroups: { label: string; keys: string[] }[];
  manualEdits: Record<string, number>;
  setManualEdits: (value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  thisMonthResidue: number;
  formatNum: (n: number) => string;
  marketSignal?: MarketSignal | null;
};

export function BuyGuideSection({
  currentMonth,
  isPanicBuyMode,
  onSaveClick,
  isSaving,
  dbHistoryBudgets,
  guide,
  names,
  assetGroups,
  manualEdits,
  setManualEdits,
  thisMonthResidue,
  formatNum,
  marketSignal,
}: BuyGuideSectionProps) {
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const hasCurrentMonthBudget = dbHistoryBudgets.some((b) =>
    b.month_date.startsWith(currentYearMonth)
  );

  const hasSignalBuy = marketSignal != null && !isPanicBuyMode &&
    Object.values(marketSignal.assetSignals).some((s) => s.multiplier > 1);

  // 매수 모드 라벨
  const getModeLabel = () => {
    if (isPanicBuyMode) return '🔥풀매수';
    if (hasSignalBuy) return getSignalLabel(marketSignal!.overallLevel);
    return '🟢정기';
  };

  // 카드 하이라이트: 시그널 기반 or 패닉 기반
  const getCardStyle = (k: string) => {
    const defaultStyle = 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-600';
    if (isPanicBuyMode && guide[k].drop <= -10) {
      return 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 ring-2 ring-rose-300 dark:ring-rose-600';
    }
    if (!isPanicBuyMode && marketSignal?.assetSignals[k]) {
      const sig = marketSignal.assetSignals[k];
      const style = SIGNAL_CARD_STYLES[sig.level];
      if (style) return style;
    }
    return defaultStyle;
  };

  return (
    <section className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-600 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Calculator
            className="text-blue-600 dark:text-blue-400"
            size={24}
          />
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {currentMonth}월 매수 가이드 ({getModeLabel()})
          </h2>
          <span className="text-[10px] text-slate-400 font-normal ml-2">
            *수량을 클릭해 수정 가능
          </span>
        </div>
        <button
          onClick={onSaveClick}
          disabled={isSaving}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-blue-500/30"
        >
          {isSaving ? (
            <RefreshCcw className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          {hasCurrentMonthBudget ? '추가 매수 기록' : '장부에 기록하기'}
        </button>
      </div>

      <div className="space-y-6 relative z-10">
        {assetGroups.map((group) => {
          const keysInGuide = group.keys.filter((k) => k in guide);
          if (keysInGuide.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-3">
                {group.label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
                {keysInGuide.map((k) => {
                  const assetSig = marketSignal?.assetSignals[k];
                  const hasExtra = guide[k].extraQty > 0;
                  const isCapped = guide[k].weightCapped;
                  return (
                    <div
                      key={k}
                      className={`p-4 sm:p-6 rounded-[2rem] border transition-all ${getCardStyle(k)}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none">
                          {names[k]}
                        </p>
                        <div className="flex flex-col items-end gap-0.5">
                          <span
                            className={`text-[10px] font-bold ${
                              guide[k].drop < 0
                                ? 'text-rose-500'
                                : 'text-emerald-500 dark:text-emerald-400'
                            }`}
                          >
                            {Math.abs(guide[k].drop).toFixed(1)}%{' '}
                            {guide[k].drop < 0 ? '▼ 전월비' : '▲ 전월비'}
                          </span>
                          {/* 시그널 뱃지 */}
                          {!isPanicBuyMode && assetSig && assetSig.score >= 36 && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300">
                              시그널 {assetSig.score}점
                            </span>
                          )}
                          {/* 비중 상한 초과 경고 */}
                          {isCapped && !isPanicBuyMode && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300">
                              비중 초과 — 추매 제한
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mb-2 relative group">
                        <div className="flex items-baseline gap-1">
                          <input
                            type="number"
                            step={k === 'btc' ? '0.000001' : '1'}
                            value={Number.isFinite(guide[k].qty) ? guide[k].qty : 0}
                            onChange={(e) =>
                              setManualEdits({
                                ...manualEdits,
                                [k]: Number(e.target.value),
                              })
                            }
                            className="bg-transparent border-b border-transparent group-hover:border-slate-300 dark:group-hover:border-slate-500 focus:border-blue-500 w-24 text-4xl font-black text-slate-900 dark:text-slate-100 p-0 outline-none transition-all"
                          />
                          <span className="text-sm font-bold text-slate-300 dark:text-slate-500">
                            주
                          </span>
                          <Edit3
                            size={12}
                            className="text-slate-300 opacity-0 group-hover:opacity-100"
                          />
                        </div>
                        {/* 추가 매수 표시 (패닉 or 시그널) */}
                        {hasExtra && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs font-bold text-slate-400">
                              기본 {formatNum(guide[k].baseQty)}
                            </span>
                            <span className={`text-xs font-black animate-pulse ${
                              isPanicBuyMode ? 'text-rose-500' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              + 시그널 추가 {formatNum(guide[k].extraQty)}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-4 leading-tight">
                        예상 체결가: {formatNum(guide[k].price)}원<br />
                        매수액: {formatNum(guide[k].spent)}원
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="bg-slate-900 dark:bg-slate-700 p-4 sm:p-6 rounded-[2.5rem] text-white flex flex-col justify-center shadow-xl">
          <p className="text-[10px] font-bold text-blue-400 uppercase mb-2 leading-none">
            이달의 잔여 현금 (CMA)
          </p>
          <p className="text-2xl font-black leading-none">
            {formatNum(thisMonthResidue)}원
          </p>
          <div className="mt-3 pt-3 border-t border-white/10">
            {isPanicBuyMode ? (
              <>
                <p className="text-[10px] opacity-60">
                  이번달 입금액 + 통장잔고 - 총 매수액
                </p>
                <p className="text-[10px] opacity-60 text-emerald-400">
                  (비상금까지 포함해 99% 투입 기준)
                </p>
              </>
            ) : hasSignalBuy ? (
              <>
                <p className="text-[10px] opacity-60">
                  이번달 입금액 + 통장잔고 - 총 매수액
                </p>
                <p className="text-[10px] opacity-60 text-amber-400">
                  (시그널 기반 보유현금 자동 투입)
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] opacity-60">
                  이번달 입금액 - 주식매수액
                </p>
                <p className="text-[10px] opacity-60 text-emerald-400">
                  (구매 후 실제 통장에 남을 예상 금액)
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
