import React from 'react';
import { Layers } from 'lucide-react';
import type { HoldingPnl } from '@/lib/holdings';
import { formatDec, formatNum, formatSignedPercent } from '@/lib/utils';
import { maskReturn } from '../../hooks/useHideReturns';
import { Card } from '../ui/Card';
import { signToneClass } from '../ui/styles';

type HoldingsPnlCardProps = {
  holdings: HoldingPnl[];
  /** 수익률 숨기기 — 현재가·손익·수익률을 *** 로 (수량·평단·투자금액은 그대로) */
  hideReturns: boolean;
};

/** '평단'·'현재가' 이름표 */
const PRICE_LABEL = 'mr-1 text-xs font-medium text-slate-500 dark:text-slate-400';

/** 부호 붙인 원 금액 '+12,345원' · '−6,789원' (1원 미만은 0원) */
function signedWon(value: number): string {
  const text = formatNum(Math.abs(value));
  if (text === '0') return '0원';
  return `${value > 0 ? '+' : '−'}${text}원`;
}

/** '+12,345원 (+3.1%)' — 원금이 없으면 금액만 */
function pnlText(pnl: number, roiPct: number | null): string {
  return roiPct == null ? signedWon(pnl) : `${signedWon(pnl)} (${formatSignedPercent(roiPct)})`;
}

/** 보유 종목 — 종목별 평단·현재가와 투자금액, 산 가격(평단) 대비 손익·수익률 (보유가 없으면 숨김) */
export function HoldingsPnlCard({ holdings, hideReturns }: HoldingsPnlCardProps) {
  if (holdings.length === 0) return null;
  return (
    <Card title="보유 종목" subtitle="산 가격(평단) 대비 손익 · 평가액 큰 순" icon={<Layers size={18} />}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
        {holdings.map((h) => (
          <li key={h.key} className="py-2.5 first:pt-0 last:pb-0">
            {/* 왼쪽은 금액(투자금액 → 손익), 오른쪽은 한 주 가격(평단 → 현재가) */}
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100">{h.name}</p>
              <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                <span className={PRICE_LABEL}>평단</span>
                {formatNum(h.avg)}원
              </p>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-3 tabular-nums">
              <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                {formatDec(h.qty)}
                {h.key === 'btc' ? '개' : '주'} · 투자 {formatNum(h.cost)}원
              </p>
              <p className="shrink-0 text-sm font-bold text-slate-900 dark:text-slate-100">
                <span className={PRICE_LABEL}>현재가</span>
                {/* 수량 × 현재가 = 평가액이므로 숨길 때는 현재가도 가린다 (코어 비중 카드와 같은 규칙) */}
                {h.price > 0 ? `${maskReturn(formatNum(h.price), hideReturns)}원` : '—'}
              </p>
            </div>
            {/* 글자처럼 1원 미만은 버려서 '0원'이 빨강·초록으로 보이지 않게 */}
            <p
              className={`mt-0.5 text-sm font-semibold tabular-nums ${signToneClass(
                hideReturns || h.pnl == null ? null : Math.trunc(h.pnl),
              )}`}
            >
              {h.pnl == null ? '시세 없음' : maskReturn(pnlText(h.pnl, h.roiPct), hideReturns)}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
