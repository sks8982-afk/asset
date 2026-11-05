import React from 'react';
import { Eye, EyeOff, Moon, RefreshCcw, Settings, Sun } from 'lucide-react';
import { APP_TZ } from '@/lib/date';
import { indexStripItems, type IndexStripItem, type MarketIndices } from '@/lib/market';

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
  /** 주요 지수 — 시장 정보라 수익률 숨기기와 무관하게 보인다 (없으면 줄을 숨긴다) */
  indices: MarketIndices | null;
};

const DIRECTION = {
  up: { arrow: '▲', label: '상승', tone: 'text-emerald-600 dark:text-emerald-400' },
  down: { arrow: '▼', label: '하락', tone: 'text-rose-600 dark:text-rose-400' },
  flat: { arrow: '', label: '보합', tone: '' },
} as const;

/** KOSPI 5,384 ▼5.3% · S&P500 7,689 ▲1.6% · 나스닥 25,737 ▲1.4% — 좁은 화면에서는 항목 단위로 줄바꿈 */
function IndexStrip({ items }: { items: IndexStripItem[] }) {
  return (
    <ul aria-label="주요 지수" className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
      {items.map((item, i) => {
        const d = DIRECTION[item.direction];
        return (
          <li key={item.key} className="whitespace-nowrap">
            {item.label} <span className="text-slate-700 dark:text-slate-300">{item.price}</span>{' '}
            <span className={d.tone}>
              <span aria-hidden="true">{d.arrow}</span>
              <span className="sr-only">{d.label} </span>
              {item.changePct}
            </span>
            {i < items.length - 1 && <span aria-hidden="true" className="ml-2 text-slate-300 dark:text-slate-600">·</span>}
          </li>
        );
      })}
    </ul>
  );
}

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

/** 제목 + 시세 기준 시각 + 아이콘 버튼 (새로고침·수익률 숨기기·다크모드·설정) + 주요 지수 한 줄 */
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
  indices,
}: HeaderSectionProps) {
  const fetchedTime = formatFetchedTime(priceFetchedAt);
  const indexItems = indexStripItems(indices);

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
      {indexItems.length > 0 && <IndexStrip items={indexItems} />}
    </header>
  );
}
