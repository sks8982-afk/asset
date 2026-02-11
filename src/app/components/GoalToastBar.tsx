'use client';

import React from 'react';
import { Target } from 'lucide-react';

type GoalToastBarProps = {
  goalToast: 'roi' | 'asset' | null;
  goalRoi: number;
  goalAsset: number;
  formatNum: (n: number) => string;
  onClose: () => void;
};

export function GoalToastBar({
  goalToast,
  goalRoi,
  goalAsset,
  formatNum,
  onClose,
}: GoalToastBarProps) {
  if (!goalToast) return null;

  return (
    <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Target size={24} />
        <p className="font-black">
          {goalToast === 'roi' && `🎉 목표 수익률 ${goalRoi}% 도달!`}
          {goalToast === 'asset' &&
            `🎉 목표 자산 ${formatNum(goalAsset)}원 도달!`}
        </p>
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
