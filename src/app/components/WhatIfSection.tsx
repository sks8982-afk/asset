'use client';

import React, { useMemo, useState } from 'react';
import { AlertOctagon, ChevronDown, ChevronUp } from 'lucide-react';
import type { MarketDataPoint, LivePrices, InvestmentRecord } from '@/lib/types';
import { filterBuyRecords, getRecordAmount, getRecordQty } from '@/lib/utils';

type WhatIfSectionProps = {
  records: InvestmentRecord[];
  marketHistory: MarketDataPoint[];
  livePrices: LivePrices | null;
  totalAsset: number;
  formatNum: (n: number) => string;
};

/**
 * "만약 과거 폭락 시점에 매도했다면?" 시뮬레이터.
 * 실제 매수 기록과 시장 폭락 시점을 교차해 가상 매도 후 결과를 보여줌.
 * → 다음 폭락장에서 "홀드한 게 다행"이란 학습 효과.
 */
export function WhatIfSection({
  records,
  marketHistory,
  livePrices,
  totalAsset,
  formatNum,
}: WhatIfSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const scenarios = useMemo(() => {
    if (!livePrices || marketHistory.length < 2 || records.length === 0) return [];

    const buyRecords = filterBuyRecords(records);
    if (buyRecords.length === 0) return [];

    // 월별 시세 맵
    const priceByMonth: Record<string, Record<string, number>> = {};
    for (const row of marketHistory) {
      const d = String(row.d ?? '');
      if (d.length >= 7) priceByMonth[d.slice(0, 7)] = row as Record<string, number>;
    }

    // 각 월별 "전월 대비 하락률 평균"을 계산해서 급락월을 추출
    const months = Object.keys(priceByMonth).sort();
    const drops: { ym: string; dropPct: number }[] = [];
    const keys = ['snp', 'nasdaq', 'kodex200', 'tech10', 'semiconductor_top10'];

    for (let i = 1; i < months.length; i++) {
      const prev = priceByMonth[months[i - 1]];
      const cur = priceByMonth[months[i]];
      let sumPct = 0;
      let count = 0;
      for (const k of keys) {
        const p = Number(prev[k]) || 0;
        const c = Number(cur[k]) || 0;
        if (p > 0 && c > 0) {
          sumPct += (c / p - 1) * 100;
          count++;
        }
      }
      if (count > 0) {
        drops.push({ ym: months[i], dropPct: sumPct / count });
      }
    }

    // 하락률 작은 순으로 상위 3개 = 급락월
    const worstMonths = [...drops]
      .sort((a, b) => a.dropPct - b.dropPct)
      .slice(0, 3)
      .filter((d) => d.dropPct < -3); // 최소 3% 이상 하락

    if (worstMonths.length === 0) return [];

    // 각 급락월까지 보유분을 그 달 시세로 매도 → 현금화 → 가치 추적
    return worstMonths.map((wm) => {
      const sellMonthPrices = priceByMonth[wm.ym];
      if (!sellMonthPrices) return null;

      // 해당 월까지 보유한 각 자산의 수량 계산
      let cashAfterSell = 0;
      const holdings: Record<string, number> = {};
      for (const r of buyRecords) {
        if (r.date.substring(0, 7) > wm.ym) continue;
        const k = r.asset_key;
        holdings[k] = (holdings[k] ?? 0) + getRecordQty(r);
      }

      // 그 시점 가격으로 매도한 가정 → 현금 확보
      for (const [k, qty] of Object.entries(holdings)) {
        const p = Number(sellMonthPrices[k]) || 0;
        cashAfterSell += qty * p;
      }

      // 매도 이후에도 매수 기록이 있으면 그건 현금에서 차감되어야 하지만,
      // 단순화를 위해 "그 달에 다 팔고 현금으로 가만히 뒀다면"으로 가정
      const additionalBuyAfter = buyRecords
        .filter((r) => r.date.substring(0, 7) > wm.ym)
        .reduce((s, r) => s + getRecordAmount(r), 0);

      const panicFinalCash = cashAfterSell; // 이후 매수는 안 했다고 가정
      const lostUpside = totalAsset - panicFinalCash - additionalBuyAfter;

      return {
        ym: wm.ym,
        dropPct: wm.dropPct,
        panicCash: panicFinalCash,
        currentValue: totalAsset,
        lostUpside,
      };
    }).filter((x): x is NonNullable<typeof x> => x != null);
  }, [records, marketHistory, livePrices, totalAsset]);

  if (scenarios.length === 0) return null;

  const totalLost = scenarios.reduce((s, x) => s + Math.max(0, x.lostUpside), 0);

  return (
    <section className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <AlertOctagon size={18} className="text-rose-500" />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            만약 그때 패닉 매도했다면?
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
            감정 매도 학습
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      {!expanded && totalLost > 0 && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          과거 급락 시점에 매도했다면 지금보다{' '}
          <span className="font-black text-rose-500">최대 {formatNum(totalLost)}원</span>{' '}
          덜 벌었을 것. 홀드가 정답이었습니다.
        </p>
      )}

      {expanded && (
        <div className="mt-4 space-y-3">
          {scenarios.map((s) => (
            <div
              key={s.ym}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {s.ym} ({s.dropPct.toFixed(1)}% 급락월)
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  이후 홀드 유지 시 지금 가치
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-300">그때 매도했다면</p>
                  <p className="font-black text-rose-700 dark:text-rose-200">{formatNum(s.panicCash)}원</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300">홀드 유지 (현재)</p>
                  <p className="font-black text-emerald-700 dark:text-emerald-200">{formatNum(s.currentValue)}원</p>
                </div>
              </div>
              {s.lostUpside > 0 && (
                <p className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  📈 홀드로 <span className="text-emerald-600">+{formatNum(s.lostUpside)}원</span> 더 벌었습니다
                </p>
              )}
            </div>
          ))}
          <p className="text-[10px] text-slate-400 pt-2">
            ※ 급락월 이후 추가 매수는 없었다고 가정한 단순 시뮬레이션입니다.
          </p>
        </div>
      )}
    </section>
  );
}
