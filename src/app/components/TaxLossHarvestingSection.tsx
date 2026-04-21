'use client';

import React, { useMemo, useState } from 'react';
import { Receipt, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import type { InvestmentRecord } from '@/lib/types';
import { calculateRealizedPnl } from '@/lib/utils';
import { FOREIGN_TAX_EXEMPTION, FOREIGN_TAX_RATE, NON_ISA_KEYS } from '@/lib/constants';

type AssetPos = { qty: number; avg: number; val?: number };

type TaxLossHarvestingSectionProps = {
  records: InvestmentRecord[];
  portfolio: Record<string, AssetPos>;
  currentPriceMap: Record<string, number>;
  names: Record<string, string>;
  formatNum: (n: number) => string;
};

/**
 * Tax-Loss Harvesting (세금 이연 최적화) 알림.
 * - ISA 밖 자산(BTC 등)의 미실현 손실을 올해 실현해 양도세 공제
 * - 12월이 가까워질수록 배너가 강조됨
 */
export function TaxLossHarvestingSection({
  records,
  portfolio,
  currentPriceMap,
  names,
  formatNum,
}: TaxLossHarvestingSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const analysis = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearRecords = records.filter((r) => r.date.startsWith(String(currentYear)));
    const realized = calculateRealizedPnl(yearRecords);

    // ISA 밖(BTC 등) 자산의 올해 실현 양도차익
    const nonIsaGain = NON_ISA_KEYS.reduce(
      (sum, k) => sum + (realized[k] ?? 0),
      0,
    );

    // 현재 포지션의 미실현 손실 (ISA 밖 자산만)
    const unrealizedLosses: { key: string; loss: number; qty: number; avg: number; price: number }[] = [];
    for (const k of NON_ISA_KEYS) {
      const pos = portfolio[k];
      const price = currentPriceMap[k] ?? 0;
      if (!pos || pos.qty <= 0 || pos.avg <= 0 || price <= 0) continue;
      const loss = (price - pos.avg) * pos.qty;
      if (loss < 0) {
        unrealizedLosses.push({
          key: k,
          loss,
          qty: pos.qty,
          avg: pos.avg,
          price,
        });
      }
    }

    // 현재 공제 한도 대비 상태
    const afterExemption = Math.max(0, nonIsaGain - FOREIGN_TAX_EXEMPTION);
    const currentTax = afterExemption * FOREIGN_TAX_RATE;

    // 손실 실현 시 절약 가능 세금
    const totalAvailableLoss = unrealizedLosses.reduce((s, x) => s + Math.abs(x.loss), 0);
    const maxTaxSaving = Math.min(currentTax, totalAvailableLoss * FOREIGN_TAX_RATE);

    return {
      nonIsaGain,
      currentTax,
      unrealizedLosses,
      totalAvailableLoss,
      maxTaxSaving,
    };
  }, [records, portfolio, currentPriceMap]);

  // 11-12월에만 표시 (또는 이미 손실 있을 때)
  const currentMonth = new Date().getMonth() + 1;
  const isHighSeason = currentMonth >= 11;
  const shouldShow = analysis.unrealizedLosses.length > 0 && analysis.currentTax > 0;

  if (!shouldShow) return null;

  return (
    <section className={`rounded-3xl border p-4 sm:p-5 ${
      isHighSeason
        ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-300 dark:border-amber-700'
        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-600'
    }`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Receipt size={18} className={isHighSeason ? 'text-amber-600' : 'text-slate-500'} />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            세금 이연 최적화 (Tax-Loss Harvesting)
          </h3>
          {isHighSeason && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 animate-pulse">
              🔥 연말 기회
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70">
          <p className="text-[10px] font-bold text-slate-500 uppercase">올해 실현 양도차익</p>
          <p className="font-black text-slate-800 dark:text-slate-200">{formatNum(analysis.nonIsaGain)}원</p>
        </div>
        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
          <p className="text-[10px] font-bold text-rose-600 dark:text-rose-300">예상 세금 (22%)</p>
          <p className="font-black text-rose-700 dark:text-rose-200">{formatNum(analysis.currentTax)}원</p>
        </div>
      </div>

      {analysis.maxTaxSaving > 0 && (
        <div className="mt-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 flex items-start gap-2">
          <AlertCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-black text-emerald-800 dark:text-emerald-200">
              💡 지금 손실 실현 시 최대 <span className="underline">{formatNum(analysis.maxTaxSaving)}원</span> 세금 절약 가능
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
              손실 자산을 매도하여 수익과 상계 → 과세 표준 감소
            </p>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">손실 포지션 (ISA 밖)</p>
          {analysis.unrealizedLosses.map((l) => (
            <div key={l.key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {names[l.key] ?? l.key}
                </p>
                <p className="text-[10px] text-slate-500">
                  평단 {formatNum(l.avg)} → 현재 {formatNum(l.price)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-rose-500">{formatNum(l.loss)}원</p>
                <p className="text-[10px] text-emerald-600 font-bold">
                  매도 시 -{formatNum(Math.abs(l.loss) * FOREIGN_TAX_RATE)}원 세금 절약
                </p>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-slate-400 pt-2">
            ※ 실제 매도 시 거래비용·재매수 가격 변동 고려 필요. 투자 목적이 바뀌지 않은 경우 &apos;페이퍼 로스&apos;로만 유지하는 것도 방법.
          </p>
        </div>
      )}
    </section>
  );
}
