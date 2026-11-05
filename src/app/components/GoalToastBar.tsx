'use client';

import React from 'react';
import { Target } from 'lucide-react';

type GoalToastBarProps = {
  open: boolean;
  goalAsset: number;
  currentAsset: number;
  formatNum: (n: number) => string;
  onClose: () => void;
};

/** 목표 자산 도달 알림 */
export function GoalToastBar({ open, goalAsset, currentAsset, formatNum, onClose }: GoalToastBarProps) {
  if (!open) return null;

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Target size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-base font-bold tabular-nums">목표 자산 {formatNum(goalAsset)}원을 넘었습니다</p>
          <p className="mt-0.5 text-sm tabular-nums">
            현재 {formatNum(currentAsset)}원 (+{formatNum(currentAsset - goalAsset)}원)
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-emerald-900/40"
      >
        닫기
      </button>
    </div>
  );
}
