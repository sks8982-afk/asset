import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type CardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** 제목 앞 아이콘 (장식용) */
  icon?: ReactNode;
  /** 제목 줄 오른쪽 버튼 등 */
  actions?: ReactNode;
  children: ReactNode;
  /** 바탕 스타일 덮어쓰기 (tailwind-merge로 충돌 클래스 정리) */
  className?: string;
};

const CONTAINER =
  'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5 sm:p-6';

/** 화면 공통 카드 — 모든 새 섹션은 이 모양 하나를 쓴다 */
export function Card({ title, subtitle, icon, actions, children, className }: CardProps) {
  const hasHeader = title != null || subtitle != null || icon != null || actions != null;
  return (
    <section className={twMerge(CONTAINER, className)}>
      {hasHeader && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            {icon != null && (
              <span className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title != null && (
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
              )}
              {subtitle != null && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          {actions != null && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
