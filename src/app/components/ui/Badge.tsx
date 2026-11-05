import type { ReactNode } from 'react';

const TONES = {
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
} as const;

type BadgeProps = {
  tone?: keyof typeof TONES;
  children: ReactNode;
};

/** 작은 꼬리표 (추정·미기록 등) */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-4 ${TONES[tone]}`}>
      {children}
    </span>
  );
}
