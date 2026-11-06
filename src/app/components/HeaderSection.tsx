import React from 'react';
import { Eye, EyeOff, Moon, RefreshCcw, Settings, Sun } from 'lucide-react';
import { APP_TZ } from '@/lib/date';

export type HeaderSectionProps = {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onRefreshPrices: () => void;
  isRefreshingPrice: boolean;
  hideReturns: boolean;
  onToggleHideReturns: () => void;
  /** 시세 조회 시각 (ISO) */
  priceFetchedAt: string | null;
  /** 실시간 조회 실패로 폴백된 자산 이름들 */
  priceStaleLabels: string[];
  /** 시세 API 호출 자체가 실패했는지 */
  priceError: boolean;
};

type IconButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** 켜고 끄는 버튼이면 현재 상태 */
  pressed?: boolean;
  children: React.ReactNode;
};

function IconButton({ label, onClick, disabled, pressed, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {children}
    </button>
  );
}

function formatFetchedTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: APP_TZ,
  });
}

/** 제목 + 시세 기준 시각 + 아이콘 버튼 (새로고침·수익률 숨기기·다크모드·설정) */
export function HeaderSection({
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  onRefreshPrices,
  isRefreshingPrice,
  hideReturns,
  onToggleHideReturns,
  priceFetchedAt,
  priceStaleLabels,
  priceError,
}: HeaderSectionProps) {
  const fetchedTime = formatFetchedTime(priceFetchedAt);

  return (
    <header>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
            실전 <span className="text-blue-600 dark:text-blue-400">투자 장부</span>
          </h1>
          {priceError ? (
            <p className="mt-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              시세 갱신 실패 — 이전 데이터를 표시 중입니다
            </p>
          ) : fetchedTime ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              시세 {fetchedTime} 기준
              {priceStaleLabels.length > 0 && (
                <span className="text-amber-700 dark:text-amber-400"> · 지연: {priceStaleLabels.join(', ')}</span>
              )}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton label="시세 새로고침" onClick={onRefreshPrices} disabled={isRefreshingPrice}>
            <RefreshCcw size={18} className={isRefreshingPrice ? 'animate-spin' : ''} aria-hidden="true" />
          </IconButton>
          <IconButton label="수익률 숨기기" onClick={onToggleHideReturns} pressed={hideReturns}>
            {hideReturns ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </IconButton>
          <IconButton label="다크 모드" onClick={onToggleDarkMode} pressed={darkMode}>
            {darkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </IconButton>
          <IconButton label="설정" onClick={onOpenSettings}>
            <Settings size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
