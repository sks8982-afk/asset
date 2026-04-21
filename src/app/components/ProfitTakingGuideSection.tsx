'use client';

import React, { useMemo, useState } from 'react';
import { Target, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

type AssetPos = { qty: number; avg: number; val: number; weight: number };

type ProfitTakingGuideSectionProps = {
  portfolio: Record<string, AssetPos>;
  targetRatios: Record<string, number>; // 목표 비중 (%)
  currentPriceMap: Record<string, number>;
  names: Record<string, string>;
  totalAsset: number;
  formatNum: (n: number) => string;
};

/**
 * 익절 가이드 — Kelly 기준 + 비중 상한.
 * - 목표 비중 1.5배 초과 시 자동 매도 권고
 * - ROI 50%↑ 달성 자산은 "일부 실현" 제안
 * - 감정("올랐으니까 다 팔아")이 아닌 수치 기반 익절
 */
export function ProfitTakingGuideSection({
  portfolio,
  targetRatios,
  currentPriceMap,
  names,
  totalAsset,
  formatNum,
}: ProfitTakingGuideSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const ratioSum = Object.values(targetRatios).reduce((a, b) => a + b, 0) || 1;

  const candidates = useMemo(() => {
    if (totalAsset <= 0) return [];

    const list: {
      key: string;
      label: string;
      currentWeight: number;
      targetWeight: number;
      excessWeight: number;
      roi: number;
      excessValue: number;
      sellQty: number;
      reason: 'weight_over' | 'big_gain' | 'both';
    }[] = [];

    for (const [k, pos] of Object.entries(portfolio)) {
      if (k === 'cash' || pos.qty <= 0) continue;
      const curP = currentPriceMap[k] ?? 0;
      if (curP <= 0 || pos.avg <= 0) continue;

      const roi = (curP / pos.avg - 1) * 100;
      const currentWeight = pos.weight;
      const targetWeight = ((targetRatios[k] ?? 0) / ratioSum) * 100;
      const excessWeight = currentWeight - targetWeight;

      const weightCapped = targetWeight > 0 && currentWeight > targetWeight * 1.5;
      const bigGain = roi >= 50;

      if (!weightCapped && !bigGain) continue;

      // 매도 수량 계산 — 목표 비중까지 되돌리는 수량
      const targetValue = (targetWeight / 100) * totalAsset;
      const excessValue = pos.val - targetValue;
      const sellQty = excessValue > 0 ? excessValue / curP : 0;

      list.push({
        key: k,
        label: names[k] ?? k,
        currentWeight,
        targetWeight,
        excessWeight,
        roi,
        excessValue: Math.max(0, excessValue),
        sellQty,
        reason: weightCapped && bigGain ? 'both' : weightCapped ? 'weight_over' : 'big_gain',
      });
    }

    return list.sort((a, b) => b.excessWeight - a.excessWeight);
  }, [portfolio, targetRatios, currentPriceMap, names, totalAsset, ratioSum]);

  if (candidates.length === 0) return null;

  return (
    <section className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-5">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Target size={18} className="text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-black tracking-tight text-emerald-900 dark:text-emerald-200">
            익절 가이드 (수치 기반)
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            {candidates.length}개 후보
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-emerald-500" /> : <ChevronDown size={16} className="text-emerald-500" />}
      </div>

      {!expanded && (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
          비중 초과 또는 ROI 50%↑ 달성 자산이 있어 부분 익절 후보입니다.
        </p>
      )}

      {expanded && (
        <div className="mt-4 space-y-3">
          {candidates.map((c) => (
            <div
              key={c.key}
              className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-emerald-200 dark:border-emerald-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">{c.label}</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold mt-1">
                    {(c.reason === 'weight_over' || c.reason === 'both') && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                        비중 초과
                      </span>
                    )}
                    {(c.reason === 'big_gain' || c.reason === 'both') && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        ROI {c.roi.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div>
                  <p className="text-slate-400 font-bold">현재 비중</p>
                  <p className="font-black text-slate-700 dark:text-slate-200">{c.currentWeight.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold">목표 비중</p>
                  <p className="font-black text-slate-700 dark:text-slate-200">{c.targetWeight.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold">초과분</p>
                  <p className="font-black text-rose-500">+{c.excessWeight.toFixed(1)}%</p>
                </div>
              </div>

              <div className="mt-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
                  💡 <span className="underline">{formatNum(c.excessValue)}원</span>만큼 매도 시 목표 비중 복원
                </p>
                {c.sellQty > 0 && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    권고 매도 수량: {c.sellQty.toFixed(c.sellQty < 10 ? 4 : 2)}
                  </p>
                )}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-slate-500 pt-2 leading-relaxed">
            ※ 감정이 아닌 <b>규율 기반</b> 익절입니다. ISA 한도(연 400만) 내에서 분산 실현하세요.
            한 번에 전량 매도보다 <b>단계별 부분 매도</b>를 권장합니다.
          </p>
        </div>
      )}
    </section>
  );
}
