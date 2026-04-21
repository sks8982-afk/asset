'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToasts, toast, type ToastKind } from '../hooks/useToast';

const ICONS: Record<ToastKind, React.ComponentType<{ size?: number; className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES: Record<ToastKind, string> = {
  success: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200',
  error:   'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-700 text-rose-800 dark:text-rose-200',
  info:    'bg-sky-50 dark:bg-sky-900/40 border-sky-200 dark:border-sky-700 text-sky-800 dark:text-sky-200',
  warning: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200',
};

export function ToastContainer() {
  const toasts = useToasts();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto min-w-[260px] max-w-[380px] px-4 py-3 rounded-2xl border shadow-lg flex items-start gap-3 text-sm font-semibold backdrop-blur-md ${STYLES[t.kind]}`}
          >
            <Icon size={18} className="flex-shrink-0 mt-0.5" />
            <p className="flex-1 whitespace-pre-wrap break-words">{t.message}</p>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
