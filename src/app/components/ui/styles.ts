/**
 * 화면 공통 모양 — 입력칸·버튼·안내 상자·손익 색을 한곳에서 정한다.
 * 바탕은 slate, 이익 emerald, 손실 rose, 안내 amber, 주요 동작 blue.
 */
import { twMerge } from 'tailwind-merge';

/** 입력칸 — 모바일에서 확대되지 않도록 16px 글자 */
export const INPUT_CLASS =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]';

/** 입력칸 모양 + 덮어쓸 클래스 (충돌하는 클래스는 뒤의 것이 이긴다) */
export function inputClass(extra?: string): string {
  return twMerge(INPUT_CLASS, extra);
}

/** 입력칸 이름표 */
export const LABEL_CLASS = 'text-xs font-semibold text-slate-500 dark:text-slate-400';

/** 카드 안의 회색 상자 */
export const PANEL_CLASS = 'rounded-xl bg-slate-50 p-4 dark:bg-slate-900/40';

/** 주의 안내 상자 */
export const NOTICE_CLASS =
  'rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200';

/** 표를 감싸는 상자 (좁은 화면에서는 표만 가로로 밀린다) */
export const TABLE_WRAP_CLASS = 'overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700';

/** 작은 설명 글 */
export const NOTE_CLASS = 'text-xs text-slate-500 dark:text-slate-400';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50';

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
} as const;

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
} as const;

export function buttonClass(
  variant: keyof typeof BUTTON_VARIANTS = 'secondary',
  size: keyof typeof BUTTON_SIZES = 'md',
  extra?: string,
): string {
  return twMerge(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], extra);
}

/** 손익 글자색 — 이익 emerald, 손실 rose, 없거나 0이면 slate */
export function signToneClass(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value === 0) return 'text-slate-600 dark:text-slate-300';
  return value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
}
