'use client';

import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from './Card';

type CollapsibleCardProps = {
  title: ReactNode;
  /** 접혀 있어도 보이는 한 줄 요약 */
  summary?: ReactNode;
  /** 제목 앞 아이콘 (장식용) */
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** 제목 줄 오른쪽 버튼 (펼치기 버튼과 따로) */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** 제목 줄을 눌러 펼치고 접는 카드 — 접힌 동안은 내용을 그리지 않는다 */
export function CollapsibleCard({
  title, summary, icon, open, onToggle, actions, children, className,
}: CollapsibleCardProps) {
  const contentId = useId();
  return (
    <Card className={className}>
      <div className="flex items-start gap-2">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={open ? contentId : undefined}
            className="flex w-full items-start gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
          >
            {icon != null && (
              <span className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true">
                {icon}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-slate-900 dark:text-slate-100">{title}</span>
              {summary != null && (
                <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">{summary}</span>
              )}
            </span>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`mt-0.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </h2>
        {actions != null && <div className="shrink-0">{actions}</div>}
      </div>
      {open && (
        <div id={contentId} className="mt-4">
          {children}
        </div>
      )}
    </Card>
  );
}
