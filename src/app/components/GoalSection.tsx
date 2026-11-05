'use client';

import React, { useState } from 'react';
import { Target } from 'lucide-react';

type GoalSectionProps = {
  goalAsset: number;
  /** 입력을 마치면(포커스 해제) 바뀐 값만 저장 */
  onSave: (goalAsset: number) => void;
};

/** 목표 자산 입력 (설정과 같은 값 — 바깥에서 값이 바뀌면 key로 다시 마운트) */
export function GoalSection({ goalAsset, onSave }: GoalSectionProps) {
  const [draft, setDraft] = useState(goalAsset);

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <Target size={14} /> 목표
      </span>
      <label className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          자산
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={draft.toLocaleString()}
          onChange={(e) =>
            setDraft(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)
          }
          onBlur={() => {
            if (draft !== goalAsset) onSave(draft);
          }}
          className="w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
        />
        <span className="text-xs text-slate-500">원</span>
      </label>
    </div>
  );
}
