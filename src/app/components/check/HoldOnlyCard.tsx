import React from 'react';
import { Archive } from 'lucide-react';
import type { HoldOnlyHolding } from '@/lib/holdings';
import { SELL_REASON_LABELS } from '@/lib/ips';
import { formatNum, formatSignedPercent } from '@/lib/utils';
import { maskReturn } from '../../hooks/useHideReturns';
import { Card } from '../ui/Card';
import { NOTE_CLASS, signToneClass } from '../ui/styles';

type HoldOnlyCardProps = {
  holdings: HoldOnlyHolding[];
  /** 수익률 숨기기 — 평가액·수익률을 *** 로 */
  hideReturns: boolean;
};

/** 보유만 하는 종목 — 추가 매수 없이 들고만 있는 종목 (없으면 숨김) */
export function HoldOnlyCard({ holdings, hideReturns }: HoldOnlyCardProps) {
  if (holdings.length === 0) return null;
  return (
    <Card title="보유만 하는 종목" subtitle="매수 계산에서 빠진 종목" icon={<Archive size={18} />}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
        {holdings.map((h) => (
          <li key={h.key} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <p className="min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100">{h.name}</p>
            <div className="shrink-0 text-right tabular-nums">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{maskReturn(formatNum(h.value), hideReturns)}원</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className={`font-semibold ${signToneClass(hideReturns ? null : h.roiPct)}`}>
                  {h.roiPct == null ? '—' : maskReturn(formatSignedPercent(h.roiPct), hideReturns)}
                </span>
                {' '}· 총자산의 {h.sharePct.toFixed(1)}%
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className={`mt-4 leading-relaxed ${NOTE_CLASS}`}>
        추가 매수 없이 보유만 합니다. 정리하려면 기록 탭 → 매도 기록에서 사유 &quot;{SELL_REASON_LABELS.simplify}&quot;를
        고르세요. ISA 안에서는 팔 때 세금이 없고, 손익은 만기 때 정산됩니다.
      </p>
    </Card>
  );
}
