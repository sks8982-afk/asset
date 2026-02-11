import React from 'react';
import { Target } from 'lucide-react';

type GoalSectionProps = {
  goalRoi: number;
  goalAsset: number;
  storageKeys: { goalRoi: string; goalAsset: string };
  setGoalRoi: (value: number) => void;
  setGoalAsset: (value: number) => void;
};

export function GoalSection({
  goalRoi,
  goalAsset,
  storageKeys,
  setGoalRoi,
  setGoalAsset,
}: GoalSectionProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <Target size={14} /> 목표
      </span>
      <label className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          수익률
        </span>
        <input
          type="number"
          value={goalRoi}
          onChange={(e) => setGoalRoi(Number(e.target.value) || 0)}
          onBlur={() =>
            localStorage.setItem(storageKeys.goalRoi, String(goalRoi))
          }
          className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
        />
        <span className="text-xs text-slate-500">%</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          자산
        </span>
        <input
          type="text"
          value={goalAsset.toLocaleString()}
          onChange={(e) =>
            setGoalAsset(
              Number(e.target.value.replace(/[^0-9]/g, '')) || 0,
            )
          }
          onBlur={() =>
            localStorage.setItem(storageKeys.goalAsset, String(goalAsset))
          }
          className="w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
        />
        <span className="text-xs text-slate-500">원</span>
      </label>
    </div>
  );
}

