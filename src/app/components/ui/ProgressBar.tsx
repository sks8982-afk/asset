import { twMerge } from 'tailwind-merge';

const FILLS = {
  blue: 'bg-blue-500 dark:bg-blue-400',
  emerald: 'bg-emerald-500 dark:bg-emerald-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  rose: 'bg-rose-500 dark:bg-rose-400',
} as const;

export type ProgressTone = keyof typeof FILLS;

type ProgressBarProps = {
  /** 채울 비율 (0~100) */
  value: number;
  /** 목표 위치 표시 (0~100) */
  marker?: number;
  tone?: ProgressTone;
  className?: string;
};

function clampPct(v: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));
}

/** 가로 막대 — 숫자는 옆 글자로 보여 주므로 화면 읽기 프로그램에서는 숨긴다 */
export function ProgressBar({ value, marker, tone = 'blue', className }: ProgressBarProps) {
  return (
    <div className={twMerge('relative h-2.5 rounded-full bg-slate-100 dark:bg-slate-700', className)} aria-hidden="true">
      <div className={`h-full rounded-full ${FILLS[tone]}`} style={{ width: `${clampPct(value)}%` }} />
      {marker != null && (
        <div
          className="absolute -bottom-1 -top-1 w-0.5 rounded-full bg-slate-900 dark:bg-slate-100"
          style={{ left: `calc(${clampPct(marker)}% - 1px)` }}
        />
      )}
    </div>
  );
}
