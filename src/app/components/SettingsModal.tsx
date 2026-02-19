'use client';

import React from 'react';
import { Settings, X } from 'lucide-react';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  inputBudget: number;
  setInputBudget: (v: number) => void;
  customRatios: Record<string, number> | null;
  setCustomRatios: React.Dispatch<
    React.SetStateAction<Record<string, number> | null>
  >;
  names: Record<string, string>;
  defaultRatios: Record<string, number>;
  storageKeyRatios: string;
  onResetToDefault: () => void;
  cmaRate: number;
  setCmaRate: (v: number) => void;
  storageKeyCmaRate: string;
};

export function SettingsModal({
  open,
  onClose,
  inputBudget,
  setInputBudget,
  customRatios,
  setCustomRatios,
  names,
  defaultRatios,
  storageKeyRatios,
  onResetToDefault,
  cmaRate,
  setCmaRate,
  storageKeyCmaRate,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
          <h2 className="text-lg font-black flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Settings size={20} /> 비중 설정
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            각 자산의 목표 비중을 입력하세요. 합이 일치하지 않아도 비율로
            사용됩니다.
          </p>
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              기본 월 투자금액
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9,]*"
                value={inputBudget.toLocaleString()}
                onChange={(e) =>
                  setInputBudget(
                    Number(e.target.value.replace(/[^0-9]/g, '')) || 0
                  )
                }
                className="w-32 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-right text-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-500">원</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              CMA 연 이자율
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={0.1}
                min={0}
                max={20}
                value={cmaRate}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 0) {
                    setCmaRate(v);
                    localStorage.setItem(storageKeyCmaRate, String(v));
                  }
                }}
                className="w-20 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-right text-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-500">%</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 -mt-2">
            잔여 현금(CMA) 월 예상 이자 계산에 사용됩니다.
          </p>
          {Object.keys(defaultRatios).map((k) => (
            <label
              key={k}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {names[k]}
              </span>
              <input
                type="number"
                step={k === 'btc' ? 0.1 : 1}
                min={0}
                value={customRatios?.[k] ?? defaultRatios[k]}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setCustomRatios((prev) => {
                    const next = { ...(prev ?? defaultRatios), [k]: v };
                    localStorage.setItem(
                      storageKeyRatios,
                      JSON.stringify(next)
                    );
                    return next;
                  });
                }}
                className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
              />
            </label>
          ))}
          <div className="flex gap-2 pt-4">
            <button
              onClick={onResetToDefault}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              기본값 복원
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
