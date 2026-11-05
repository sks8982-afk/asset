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
    <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Target size={24} />
        <div className="font-black">
          <p>🎉 목표 자산 {formatNum(goalAsset)}원 돌파!</p>
          <p className="text-sm font-bold opacity-90 mt-0.5">
            현재 자산: <span className="underline">{formatNum(currentAsset)}원</span>
            {' '}(+{formatNum(currentAsset - goalAsset)}원 초과)
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm font-bold"
      >
        닫기
      </button>
    </div>
  );
}
