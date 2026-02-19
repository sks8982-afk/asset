'use client';

import React from 'react';
import { Trash2, X } from 'lucide-react';

export type RecordBatchItem = {
  key: string;
  date: string;
  batchId: string | null;
  count: number;
};

type DeleteByDateModalProps = {
  open: boolean;
  onClose: () => void;
  /** 날짜+배치별 기록 (같은 날 여러 번 저장한 것을 차수별로 표시) */
  recordBatches: RecordBatchItem[];
  selectedKeys: string[];
  onToggleBatch: (key: string) => void;
  passwordValue: string;
  onPasswordChange: (v: string) => void;
  onConfirm: () => void;
  isDeleting: boolean;
};

export function DeleteByDateModal({
  open,
  onClose,
  recordBatches,
  selectedKeys,
  onToggleBatch,
  passwordValue,
  onPasswordChange,
  onConfirm,
  isDeleting,
}: DeleteByDateModalProps) {
  const dateCount: Record<string, number> = {};
  const batchLabels = recordBatches.map((b) => {
    dateCount[b.date] = (dateCount[b.date] ?? 0) + 1;
    const nth = dateCount[b.date];
    return { ...b, nth };
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-2xl max-w-sm w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Trash2 size={20} className="text-rose-500" /> 기록 삭제
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 px-6 pt-3">
          같은 날 여러 번 저장한 경우 차수별로 나뉩니다. 삭제할 차수만 선택한 뒤 비밀번호를 입력하세요.
        </p>
        <div className="px-6 py-3 overflow-y-auto flex-1">
          <div className="flex flex-wrap gap-2">
            {batchLabels.map((b) => (
              <label
                key={b.key}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold cursor-pointer transition-colors ${
                  selectedKeys.includes(b.key)
                    ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                    : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(b.key)}
                  onChange={() => onToggleBatch(b.key)}
                  className="sr-only"
                />
                <span>
                  {b.date} ({b.nth}차, {b.count}건)
                </span>
              </label>
            ))}
          </div>
          {recordBatches.length === 0 && (
            <p className="text-sm text-slate-400 py-2">삭제할 수 있는 기록이 없습니다.</p>
          )}
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-slate-600 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            placeholder="비밀번호"
            value={passwordValue}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm();
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting || selectedKeys.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 disabled:opacity-50"
            >
              {isDeleting ? '삭제 중…' : `선택 삭제 (${selectedKeys.length}개)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
