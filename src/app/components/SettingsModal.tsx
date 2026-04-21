'use client';

import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';

type RatioPreset = { name: string; ratios: Record<string, number> };

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  storageKeyBudget: string;
  inputBudget: number;
  setInputBudget: (v: number) => void;
  customRatios: Record<string, number> | null;
  setCustomRatios: React.Dispatch<
    React.SetStateAction<Record<string, number> | null>
  >;
  names: Record<string, string>;
  defaultRatios: Record<string, number>;
  storageKeyRatios: string;
  ratioPresets: RatioPreset[];
  cmaRate: number;
  setCmaRate: (v: number) => void;
  storageKeyCmaRate: string;
  emergencyFundAmount: number;
  setEmergencyFundAmount: (v: number) => void;
  saveEmergencyFundToDb: (amount: number) => Promise<void>;
};

export function SettingsModal(props: SettingsModalProps) {
  if (!props.open) return null;
  // key-based remount ensures draft state resets every time modal opens
  return <SettingsModalBody key={`${props.inputBudget}-${props.cmaRate}-${props.emergencyFundAmount}`} {...props} />;
}

function SettingsModalBody({
  onClose,
  storageKeyBudget,
  inputBudget,
  setInputBudget,
  customRatios,
  setCustomRatios,
  names,
  defaultRatios,
  storageKeyRatios,
  ratioPresets,
  cmaRate,
  setCmaRate,
  storageKeyCmaRate,
  emergencyFundAmount,
  setEmergencyFundAmount,
  saveEmergencyFundToDb,
}: SettingsModalProps) {
  const [draftBudget, setDraftBudget] = useState(inputBudget);
  const [draftRatios, setDraftRatios] = useState<Record<string, number>>(
    () => customRatios ?? defaultRatios
  );
  const [draftCmaRate, setDraftCmaRate] = useState(cmaRate);
  const [draftEmergencyFund, setDraftEmergencyFund] = useState(emergencyFundAmount);

  const handleSave = () => {
    setInputBudget(draftBudget);
    setCustomRatios(draftRatios);
    setCmaRate(draftCmaRate);
    setEmergencyFundAmount(draftEmergencyFund);
    if (Number.isFinite(draftBudget) && draftBudget >= 0)
      localStorage.setItem(storageKeyBudget, String(draftBudget));
    localStorage.setItem(storageKeyRatios, JSON.stringify(draftRatios));
    if (Number.isFinite(draftCmaRate) && draftCmaRate >= 0)
      localStorage.setItem(storageKeyCmaRate, String(draftCmaRate));
    saveEmergencyFundToDb(draftEmergencyFund);
    onClose();
  };

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
                value={draftBudget.toLocaleString()}
                onChange={(e) =>
                  setDraftBudget(
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
                value={draftCmaRate}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 0) setDraftCmaRate(v);
                }}
                className="w-20 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-right text-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-500">%</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 -mt-2">
            잔여 현금(CMA) 월 예상 이자 계산에 사용됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-full">
              비중 프리셋
            </span>
            {ratioPresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setDraftRatios({ ...preset.ratios })}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600/50"
              >
                {preset.name}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              비상금 (고정 금액)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9,]*"
                value={draftEmergencyFund.toLocaleString()}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                  if (Number.isFinite(v) && v >= 0) setDraftEmergencyFund(v);
                }}
                className="w-32 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-right text-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-500">원</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 -mt-2">
            일상생활용 현금으로 유지할 고정 금액. 통장 잔고에서 이만큼을 제외한 나머지를 &quot;투자 가능&quot;으로 표시합니다.
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
                value={draftRatios[k] ?? defaultRatios[k]}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setDraftRatios((prev) => ({ ...prev, [k]: v }));
                }}
                className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
              />
            </label>
          ))}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => setDraftRatios({ ...defaultRatios })}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              기본값 복원
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
