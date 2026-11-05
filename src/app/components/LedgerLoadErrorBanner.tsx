import React from 'react';
import { CircleAlert, RefreshCcw } from 'lucide-react';
import { buttonClass } from './ui/styles';

type LedgerLoadErrorBannerProps = {
  message: string;
  /** 이전에 불러온 장부를 보여 주는 중인지 (처음부터 못 불러왔으면 false) */
  showingPrevious: boolean;
  onRetry: () => void;
  retrying: boolean;
};

/** 장부 읽기 실패 안내 — 닫을 수 없다 (다시 불러오기에 성공하면 사라진다) */
export function LedgerLoadErrorBanner({ message, showingPrevious, onRetry, retrying }: LedgerLoadErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-2">
        <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 break-keep">
          <p className="text-sm font-bold">{message}</p>
          <p className="mt-0.5 text-xs text-rose-800/80 dark:text-rose-200/80">
            {showingPrevious
              ? '마지막으로 불러온 장부를 보여 주는 중입니다. 다시 불러올 때까지 기록·삭제는 막아 둡니다.'
              : '장부를 불러올 때까지 금액을 표시하지 않고 기록·삭제도 막아 둡니다.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className={buttonClass('secondary', 'sm', 'ml-6 shrink-0 self-start sm:ml-0 sm:self-auto')}
      >
        <RefreshCcw size={14} className={retrying ? 'animate-spin' : ''} aria-hidden="true" />
        {retrying ? '불러오는 중…' : '다시 불러오기'}
      </button>
    </div>
  );
}
