'use client';

import React, { useMemo } from 'react';
import { Landmark } from 'lucide-react';
import type { DbHistory } from '@/lib/types';
import { ISA_ANNUAL_DEPOSIT_LIMIT } from '@/lib/constants';
import { depositsInYear, isaMaturityStatus, resolveIsaOpenDate } from '@/lib/isa';
import { calculateIsaProjection } from '@/lib/tax';
import { formatMonthsKo, todayISO } from '@/lib/date';
import { formatNum } from '@/lib/utils';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ProgressBar, type ProgressTone } from '../ui/ProgressBar';
import { NOTE_CLASS, PANEL_CLASS } from '../ui/styles';

type IsaPlanCardProps = {
  dbHistory: Pick<DbHistory, 'budgets' | 'records' | 'dividends'>;
  /** 평가에 쓰는 현재가 */
  prices: Record<string, number>;
  /** 설정의 ISA 가입일 */
  isaOpenDate: string | null;
};

const SECTION_TITLE = 'text-sm font-bold text-slate-900 dark:text-slate-100';

function Row({ label, value, strong = false }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
      <dt className={strong ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}>{label}</dt>
      <dd className={strong ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-800 dark:text-slate-200'}>{value}</dd>
    </div>
  );
}

function usageTone(pct: number): ProgressTone {
  if (pct > 100) return 'rose';
  return pct >= 80 ? 'amber' : 'blue';
}

/** 가입일·의무가입 만기 */
function IsaDates({ isaOpenDate, budgets, today }: {
  isaOpenDate: string | null;
  budgets: DbHistory['budgets'];
  today: string;
}) {
  const open = resolveIsaOpenDate(isaOpenDate, budgets);
  if (!open) {
    return <p className={NOTE_CLASS}>ISA 가입일을 설정에서 입력하면 의무가입 만기를 계산합니다.</p>;
  }
  const status = isaMaturityStatus(open.date, today);
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-slate-600 dark:text-slate-300">ISA 가입일</span>
        <span className="flex flex-wrap items-center justify-end gap-1.5 font-semibold tabular-nums text-slate-800 dark:text-slate-200">
          {open.estimated && <Badge tone="amber">추정 — 설정에서 실제 가입일을 입력하세요</Badge>}
          {open.date}
        </span>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-slate-600 dark:text-slate-300">의무가입 만기</span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{status.maturity}</span>
        </div>
        {status.passed ? (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">의무기간 지남 — 해지하거나 계속 유지할 수 있습니다</p>
        ) : (
          <p className="mt-0.5 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {status.monthsLeft > 0 ? `${formatMonthsKo(status.monthsLeft)} 남음` : '1개월 안에 끝납니다'}
          </p>
        )}
      </div>
    </div>
  );
}

/** ISA 계획 — 의무가입 만기, 올해 납입 한도, 비과세 한도(지금 전부 정리한다면), 만기 후 연금저축 이전 */
export function IsaPlanCard({ dbHistory, prices, isaOpenDate }: IsaPlanCardProps) {
  const today = todayISO();
  const year = today.slice(0, 4);
  const paidThisYear = depositsInYear(dbHistory.budgets, year);
  const paidPct = (paidThisYear / ISA_ANNUAL_DEPOSIT_LIMIT) * 100;
  const projection = useMemo(
    () => calculateIsaProjection(dbHistory.records, dbHistory.dividends, prices),
    [dbHistory.records, dbHistory.dividends, prices],
  );
  const taxableSum = projection.realizedTaxable + projection.unrealizedTaxable;
  const taxFreePct = (projection.totalTaxable / projection.taxFreeLimit) * 100;

  return (
    <Card title="ISA 계획" icon={<Landmark size={18} />} actions={<Badge>서민형</Badge>}>
      <IsaDates isaOpenDate={isaOpenDate} budgets={dbHistory.budgets} today={today} />

      <section className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700/60">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={SECTION_TITLE}>납입 한도 · {year}년</h3>
          <p className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-slate-100">{formatNum(paidThisYear)}</span>
            {' '}/ {formatNum(ISA_ANNUAL_DEPOSIT_LIMIT)}원
          </p>
        </div>
        <ProgressBar value={paidPct} className="mt-2" />
        <p className={`mt-2 ${NOTE_CLASS}`}>안 쓴 한도는 다음 해로 이월됩니다(총 1억원).</p>
      </section>

      <section className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700/60">
        <h3 className={SECTION_TITLE}>비과세 한도</h3>
        <dl className="mt-2 space-y-1.5">
          <Row label="실현 과세대상" value={`${formatNum(projection.realizedTaxable)}원`} />
          <Row label="평가 과세대상" value={`${formatNum(projection.unrealizedTaxable)}원`} />
          <div className="border-t border-slate-100 pt-1.5 dark:border-slate-700/60">
            <Row
              strong
              label="합계"
              value={
                <>
                  {formatNum(taxableSum)}원
                  <span className="font-normal text-slate-500 dark:text-slate-400"> / {formatNum(projection.taxFreeLimit)}원</span>
                </>
              }
            />
          </div>
        </dl>
        <ProgressBar value={taxFreePct} tone={usageTone(taxFreePct)} className="mt-2" />
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          지금 전부 정리하면 예상 세금{' '}
          <span className={`font-bold tabular-nums ${projection.estimatedTaxIfRealizedNow > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {formatNum(projection.estimatedTaxIfRealizedNow)}원
          </span>
        </p>
      </section>

      <p className={`mt-5 text-sm text-slate-700 dark:text-slate-200 ${PANEL_CLASS}`}>
        만기 자금을 60일 안에 연금저축으로 옮기면 옮긴 금액의 10%(최대 300만원)를 추가로 세액공제 받을 수 있습니다.
      </p>
      <p className={`mt-3 leading-relaxed ${NOTE_CLASS}`}>
        서민형 기준(비과세 400만원, 초과분 9.9% 분리과세). 국내주식·국내주식형 ETF 손익은 비과세로 보고 제외한 보수적
        추정입니다.
      </p>
    </Card>
  );
}
