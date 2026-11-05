'use client';

import React, { useId, useState } from 'react';
import { AlertTriangle, LogOut, Settings, X } from 'lucide-react';
import {
  diffSettings, sp500PctOf, weightsFromSp500Pct, type AppSettings, type SettingsPatch,
} from '@/lib/settings';
import { todayISO } from '@/lib/date';
import { useAuth } from './AuthGate';
import { toast } from '../hooks/useToast';
import { IntegerInput } from './ui/IntegerInput';

/** DB 초기화 버튼을 켜려면 입력해야 하는 문구 */
const RESET_CONFIRM_WORD = '초기화';

const FIELD_CLASS =
  'w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-base font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  /** 바뀐 필드만 넘긴다 */
  onSave: (patch: SettingsPatch) => Promise<void>;
  /** 장부 전체 삭제 */
  onResetDb: () => Promise<void>;
  isResetting: boolean;
};

export function SettingsModal(props: SettingsModalProps) {
  if (!props.open) return null;
  // 열 때마다 새로 마운트해 입력 초안을 현재 설정으로 초기화
  return <SettingsModalBody {...props} />;
}

type FieldRowProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
};

function FieldRow({ label, htmlFor, hint, children }: FieldRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={htmlFor} className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {label}
        </label>
        <div className="flex items-center gap-1.5">{children}</div>
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

function SettingsModalBody({ onClose, settings, onSave, onResetDb, isResetting }: SettingsModalProps) {
  const { signOut } = useAuth();
  const ids = { title: useId(), budget: useId(), weight: useId(), cma: useId(), fund: useId(), goal: useId(), isa: useId() };
  const [signingOut, setSigningOut] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [sp500Pct, setSp500Pct] = useState(() => sp500PctOf(settings.coreWeights));

  const update = (patch: Partial<AppSettings>) => setDraft((prev) => ({ ...prev, ...patch }));

  const handleSave = () => {
    const next: AppSettings = {
      ...draft,
      // 비중을 손대지 않았으면 기존 값(소수 비중) 그대로 — 반올림 때문에 바뀐 것으로 보지 않도록
      coreWeights: sp500Pct === sp500PctOf(settings.coreWeights) ? settings.coreWeights : weightsFromSp500Pct(sp500Pct),
    };
    const patch = diffSettings(settings, next);
    if (Object.keys(patch).length > 0) void onSave(patch);
    onClose();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const { error } = await signOut();
    // 성공하면 로그인 화면으로 바뀌며 이 창도 사라진다
    if (error) {
      toast.error(error);
      setSigningOut(false);
    }
  };

  const handleResetDb = async () => {
    if (resetConfirm.trim() !== RESET_CONFIRM_WORD) return;
    await onResetDb();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
          <h2 id={ids.title} className="text-lg font-black flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Settings size={20} aria-hidden="true" /> 설정
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <FieldRow label="월 적립 금액" htmlFor={ids.budget} hint="이번 달 화면의 입금액 기본값">
            <IntegerInput
              id={ids.budget}
              value={draft.monthlyBudget}
              onValueChange={(monthlyBudget) => update({ monthlyBudget })}
              className={FIELD_CLASS}
            />
            <span className="text-xs text-slate-500">원</span>
          </FieldRow>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor={ids.weight} className="text-sm font-bold text-slate-700 dark:text-slate-200">
                코어 비중
              </label>
              <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                S&amp;P500 {sp500Pct}% : 나스닥100 {100 - sp500Pct}%
              </span>
            </div>
            <input
              id={ids.weight}
              type="range"
              min={0}
              max={100}
              step={5}
              value={sp500Pct}
              onChange={(e) => setSp500Pct(Number(e.target.value))}
              aria-valuetext={`S&P500 ${sp500Pct}%, 나스닥100 ${100 - sp500Pct}%`}
              className="mt-2 w-full accent-blue-600"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              S&amp;P500 비중(5% 단위). 나머지는 나스닥100입니다.
            </p>
          </div>

          <FieldRow label="CMA 금리" htmlFor={ids.cma} hint="장부 현금에 붙는 연 이자율 (세전, 일별 반영)">
            <input
              id={ids.cma}
              type="number"
              inputMode="decimal"
              step={0.01}
              min={0}
              max={20}
              value={draft.cmaRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 0 && v <= 20) update({ cmaRate: v });
              }}
              className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-base font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <span className="text-xs text-slate-500">%</span>
          </FieldRow>

          <FieldRow label="비상금" htmlFor={ids.fund} hint="장부 현금 중 투자하지 않고 남겨 둘 금액 — 나머지가 투자 대기 현금이 됩니다">
            <IntegerInput
              id={ids.fund}
              value={draft.emergencyFundAmount}
              onValueChange={(emergencyFundAmount) => update({ emergencyFundAmount })}
              className={FIELD_CLASS}
            />
            <span className="text-xs text-slate-500">원</span>
          </FieldRow>

          <FieldRow label="목표 자산" htmlFor={ids.goal}>
            <IntegerInput
              id={ids.goal}
              value={draft.goalAsset}
              onValueChange={(goalAsset) => update({ goalAsset })}
              className={FIELD_CLASS}
            />
            <span className="text-xs text-slate-500">원</span>
          </FieldRow>

          <FieldRow label="ISA 가입일" htmlFor={ids.isa} hint="선택 — 비워 둬도 됩니다">
            <input
              id={ids.isa}
              type="date"
              max={todayISO()}
              value={draft.isaOpenDate ?? ''}
              onChange={(e) => update({ isaOpenDate: e.target.value || null })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
            />
            {draft.isaOpenDate && (
              <button
                type="button"
                onClick={() => update({ isaOpenDate: null })}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              >
                비우기
              </button>
            )}
          </FieldRow>

          <div className="flex gap-2 pt-2">
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

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-600">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogOut size={16} />
            {signingOut ? '로그아웃 중…' : '로그아웃'}
          </button>
        </div>

        {/* 위험 구역 — 입력 확인 후에만 실행 */}
        <div className="p-6 border-t border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20 space-y-3">
          <h3 className="text-sm font-black text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle size={16} /> 위험 구역 · DB 초기화
          </h3>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
            매수·매도 기록, 월별 입금, 배당 기록이 모두 삭제됩니다. 되돌릴 수 없습니다.
          </p>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            실행하려면 &quot;{RESET_CONFIRM_WORD}&quot;를 입력하세요
            <input
              type="text"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder={RESET_CONFIRM_WORD}
              autoComplete="off"
              className="mt-1.5 w-full px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </label>
          <button
            type="button"
            onClick={handleResetDb}
            disabled={resetConfirm.trim() !== RESET_CONFIRM_WORD || isResetting}
            className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isResetting ? '초기화 중…' : 'DB 초기화'}
          </button>
        </div>
      </div>
    </div>
  );
}
