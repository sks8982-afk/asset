'use client';

import React from 'react';
import { Trash2, Save } from 'lucide-react';

type PasswordConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  passwordValue: string;
  onPasswordChange: (v: string) => void;
  onConfirm: () => void;
  isSaving: boolean;
  variant: 'reset-db' | 'panic-save';
};

const CONFIG = {
  'reset-db': {
    title: 'DB 초기화',
    description:
      '비밀번호를 입력하면 모든 투자 기록과 월별 예산이 삭제됩니다.',
    confirmLabel: '초기화 실행',
    Icon: Trash2,
    iconClass: 'text-rose-500',
    buttonClass:
      'flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 disabled:opacity-50',
  },
  'panic-save': {
    title: '장부 기록',
    description: '비밀번호를 입력하면 장부에 기록됩니다.',
    confirmLabel: '저장',
    Icon: Save,
    iconClass: 'text-blue-500',
    buttonClass:
      'flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50',
  },
};

export function PasswordConfirmModal({
  open,
  onClose,
  passwordValue,
  onPasswordChange,
  onConfirm,
  isSaving,
  variant,
}: PasswordConfirmModalProps) {
  if (!open) return null;

  const { title, description, confirmLabel, Icon, iconClass, buttonClass } =
    CONFIG[variant];

  const handleBackdropClick = () => {
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-2xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Icon size={20} className={iconClass} /> {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {description}
        </p>
        <input
          type="password"
          inputMode="numeric"
          placeholder="비밀번호"
          value={passwordValue}
          onChange={(e) => onPasswordChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
          }}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 mb-4"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving}
            className={buttonClass}
          >
            {isSaving ? (variant === 'panic-save' ? '저장 중…' : '처리 중…') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
