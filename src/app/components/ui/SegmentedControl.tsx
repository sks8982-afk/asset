import type { ReactNode } from 'react';

type SegmentOption<T extends string> = { value: T; label: ReactNode };

type SegmentedControlProps<T extends string> = {
  /** 묶음 이름 (화면 읽기용) */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** 두세 가지 보기 중 하나를 고르는 토글 (총합/종목별, 목록/달력) */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-600 dark:bg-slate-900/40"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ${
              selected
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
