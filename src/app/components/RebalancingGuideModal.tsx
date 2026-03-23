'use client';

import React, { useState } from 'react';
import { Scale, X, Save, History } from 'lucide-react';

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

export type RebalancingSnapshot = {
  date: string;
  totalAsset: number;
  items: RebalancingItem[];
};

type RebalancingGuideModalProps = {
  open: boolean;
  onClose: () => void;
  totalAsset: number;
  items: RebalancingItem[];
  formatNum: (n: number) => string;
  darkMode: boolean;
  /** 리밸런싱 히스토리 */
  history?: RebalancingSnapshot[];
  /** 스냅샷 저장 콜백 */
  onSaveSnapshot?: () => void;
};

export function RebalancingGuideModal({
  open,
  onClose,
  totalAsset,
  items,
  formatNum,
  darkMode,
  history = [],
  onSaveSnapshot,
}: RebalancingGuideModalProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number | null>(null);

  if (!open) return null;

  const toSell = items.filter((i) => i.diff < -0.01);
  const toBuy = items.filter((i) => i.diff > 0.01);
  const sellTotal = toSell.reduce((s, i) => s + Math.abs(i.diff), 0);
  const buyTotal = toBuy.reduce((s, i) => s + i.diff, 0);

  // 이전 스냅샷과 비교
  const prevSnapshot = selectedHistoryIdx != null ? history[selectedHistoryIdx] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Scale size={20} className="text-blue-500" /> 리밸런싱 가이드
          </h3>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 ${showHistory ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
                title="히스토리"
              >
                <History size={18} />
              </button>
            )}
            {onSaveSnapshot && (
              <button
                type="button"
                onClick={onSaveSnapshot}
                className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                title="현재 상태 스냅샷 저장"
              >
                <Save size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 히스토리 패널 */}
        {showHistory && history.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-xs font-bold text-slate-500 mb-2">리밸런싱 기록</p>
            <div className="flex flex-wrap gap-2">
              {history.map((snap, idx) => (
                <button
                  key={snap.date}
                  type="button"
                  onClick={() => setSelectedHistoryIdx(selectedHistoryIdx === idx ? null : idx)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedHistoryIdx === idx
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {snap.date} ({formatNum(snap.totalAsset)}원)
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 px-6 pt-3">
          목표 비중에 맞추려면 아래처럼 조정하세요. 실제 매도/매수는 증권사에서 진행한 뒤 장부에 기록하세요.
        </p>
        <div className="px-6 py-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          총자산: {formatNum(totalAsset)}원
          {prevSnapshot && (
            <span className="text-xs font-normal text-slate-400 ml-2">
              (이전: {formatNum(prevSnapshot.totalAsset)}원,
              {' '}{totalAsset >= prevSnapshot.totalAsset ? '+' : ''}
              {formatNum(totalAsset - prevSnapshot.totalAsset)}원)
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {toSell.length > 0 && (
            <div>
              <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase mb-2">
                매도 (목표 대비 초과)
              </p>
              <ul className="space-y-1.5">
                {toSell.map((i) => {
                  const prevItem = prevSnapshot?.items.find((p) => p.key === i.key);
                  return (
                    <li
                      key={i.key}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-slate-700 dark:text-slate-300">
                        {i.name}
                        <span className="text-xs text-slate-400 ml-1">
                          ({i.currentWeight.toFixed(1)}% → {i.targetWeight.toFixed(1)}%)
                        </span>
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          약 {formatNum(Math.abs(i.diff))}원
                        </span>
                        {prevItem && (
                          <div className="text-[10px] text-slate-400">
                            이전: {prevItem.currentWeight.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {toBuy.length > 0 && (
            <div>
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                매수 (목표 대비 부족)
              </p>
              <ul className="space-y-1.5">
                {toBuy.map((i) => {
                  const prevItem = prevSnapshot?.items.find((p) => p.key === i.key);
                  return (
                    <li
                      key={i.key}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-slate-700 dark:text-slate-300">
                        {i.name}
                        <span className="text-xs text-slate-400 ml-1">
                          ({i.currentWeight.toFixed(1)}% → {i.targetWeight.toFixed(1)}%)
                        </span>
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          약 {formatNum(i.diff)}원
                        </span>
                        {prevItem && (
                          <div className="text-[10px] text-slate-400">
                            이전: {prevItem.currentWeight.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
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
