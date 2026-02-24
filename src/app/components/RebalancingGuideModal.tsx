'use client';

import React from 'react';
import { Scale, X } from 'lucide-react';

export type RebalancingItem = {
  key: string;
  name: string;
  targetWeight: number;
  currentWeight: number;
  targetAmount: number;
  currentAmount: number;
  /** 목표 - 현재. 양수면 매수, 음수면 매도 */
  diff: number;
};

type RebalancingGuideModalProps = {
  open: boolean;
  onClose: () => void;
  totalAsset: number;
  items: RebalancingItem[];
  formatNum: (n: number) => string;
  darkMode: boolean;
};

export function RebalancingGuideModal({
  open,
  onClose,
  totalAsset,
  items,
  formatNum,
  darkMode,
}: RebalancingGuideModalProps) {
  if (!open) return null;

  const toSell = items.filter((i) => i.diff < -0.01);
  const toBuy = items.filter((i) => i.diff > 0.01);
  const sellTotal = toSell.reduce((s, i) => s + Math.abs(i.diff), 0);
  const buyTotal = toBuy.reduce((s, i) => s + i.diff, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Scale size={20} className="text-blue-500" /> 리밸런싱 가이드
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
          목표 비중에 맞추려면 아래처럼 조정하세요. 실제 매도/매수는 증권사에서 진행한 뒤 장부에 기록하세요.
        </p>
        <div className="px-6 py-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          총자산: {formatNum(totalAsset)}원
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {toSell.length > 0 && (
            <div>
              <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase mb-2">
                매도 (목표 대비 초과)
              </p>
              <ul className="space-y-1.5">
                {toSell.map((i) => (
                  <li
                    key={i.key}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {i.name}
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      약 {formatNum(Math.abs(i.diff))}원 매도
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {toBuy.length > 0 && (
            <div>
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                매수 (목표 대비 부족)
              </p>
              <ul className="space-y-1.5">
                {toBuy.map((i) => (
                  <li
                    key={i.key}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {i.name}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      약 {formatNum(i.diff)}원 매수
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {toSell.length === 0 && toBuy.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              이미 목표 비중에 가깝습니다. 리밸런싱이 크게 필요하지 않습니다.
            </p>
          )}
          {toSell.length > 0 && toBuy.length > 0 && (
            <p className="text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-600 pt-3 mt-3">
              매도 합계 ≈ {formatNum(sellTotal)}원 → 매수 합계 ≈ {formatNum(buyTotal)}원
              (수수료·세금 제외)
            </p>
          )}
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-slate-600">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-500"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
