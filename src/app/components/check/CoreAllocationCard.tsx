'use client';

import React, { useId, useState } from 'react';
import { ChevronDown, PieChart } from 'lucide-react';
import type { CoreAllocation, CoreGroupAllocation, HeldPosition } from '@/lib/holdings';
import { DRIFT_ALERT_PP, coreGroupLabel } from '@/lib/monthly';
import { formatNum, formatSignedPercent } from '@/lib/utils';
import { maskReturn } from '../../hooks/useHideReturns';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { NOTICE_CLASS, NOTE_CLASS, signToneClass } from '../ui/styles';

type CoreAllocationCardProps = {
  allocation: CoreAllocation;
  /** 수익률 숨기기 — 평가액·수익률을 *** 로 (원금·비중은 그대로) */
  hideReturns: boolean;
};

const round1 = (v: number): string => (Math.round(v * 10) / 10).toString();

function PositionRow({ position, hideReturns }: { position: HeldPosition; hideReturns: boolean }) {
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{position.name}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs tabular-nums">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500 dark:text-slate-400">수량</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-200">{formatNum(position.qty)}주</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500 dark:text-slate-400">평단</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-200">{formatNum(position.avg)}원</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500 dark:text-slate-400">현재가</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-200">
            {/* 수량 × 현재가 = 평가액이므로 숨길 때는 현재가도 가린다 */}
            {position.price > 0 ? `${maskReturn(formatNum(position.price), hideReturns)}원` : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500 dark:text-slate-400">평가액</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-200">{maskReturn(formatNum(position.value), hideReturns)}원</dd>
        </div>
      </dl>
    </li>
  );
}

function GroupBlock({ group, hasCore, hideReturns }: { group: CoreGroupAllocation; hasCore: boolean; hideReturns: boolean }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const drifted = Math.abs(group.deviationPp) > DRIFT_ALERT_PP;
  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{group.label}</h3>
        <p className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {maskReturn(formatNum(group.value), hideReturns)}원
        </p>
      </div>
      <p className="mt-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
        원금 {formatNum(group.cost)}원 · 수익률{' '}
        <span className={`font-semibold ${signToneClass(hideReturns ? null : group.roiPct)}`}>
          {group.roiPct == null ? '—' : maskReturn(formatSignedPercent(group.roiPct), hideReturns)}
        </span>
      </p>

      {hasCore && (
        <div className="mt-3">
          <ProgressBar value={group.weightPct} marker={group.targetPct} />
          <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            <span>
              현재 <span className="font-semibold text-slate-800 dark:text-slate-200">{round1(group.weightPct)}%</span>
              {' '}· 목표 {round1(group.targetPct)}%
            </span>
            <span className={drifted ? 'font-semibold text-amber-700 dark:text-amber-400' : ''}>
              목표 대비 {formatSignedPercent(group.deviationPp, 1, '%p')}
            </span>
          </p>
        </div>
      )}

      {group.positions.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            className="inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-slate-100"
          >
            보유 종목 {group.positions.length}개
            <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <ul id={listId} className="mt-2 divide-y divide-slate-100 rounded-xl bg-slate-50 p-3 dark:divide-slate-700/60 dark:bg-slate-900/40">
              {group.positions.map((p) => (
                <PositionRow key={p.key} position={p} hideReturns={hideReturns} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/** 코어 비중 — S&P500·나스닥100 묶음별 평가액·원금·수익률과 목표 대비 비중 */
export function CoreAllocationCard({ allocation, hideReturns }: CoreAllocationCardProps) {
  const { groups, total, boost } = allocation;
  const target = groups.map((g) => `${g.label} ${round1(g.targetPct)}`).join(' : ');
  return (
    <Card title="코어 비중" subtitle={`목표 ${target} · 코어 평가액 기준`} icon={<PieChart size={18} />}>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
        {groups.map((g) => (
          <GroupBlock key={g.group} group={g} hasCore={total > 0} hideReturns={hideReturns} />
        ))}
      </div>
      {total <= 0 && (
        <p className={`mt-4 ${NOTE_CLASS}`}>아직 코어 보유가 없습니다. 이번 달 화면에서 첫 적립을 기록하면 비중이 나타납니다.</p>
      )}
      {groups.some((g) => g.missingPrice) && (
        <p className={`mt-4 ${NOTE_CLASS}`}>
          시세를 받지 못한 종목이 있어 비중과 수익률이 실제와 다를 수 있습니다. 시세를 새로고침해 보세요.
        </p>
      )}
      {boost && (
        <p className={`mt-4 ${NOTICE_CLASS}`}>
          새로 넣는 돈으로 맞춰 갑니다 — 이번 달 화면이 {coreGroupLabel(boost)} 쪽을 더 사도록 안내합니다.
        </p>
      )}
    </Card>
  );
}
