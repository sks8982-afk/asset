'use client';

import { useRef, type KeyboardEvent } from 'react';
import { TAB_IDS, tabForKey, type TabId } from '@/lib/tabs';

const TAB_LABELS: Record<TabId, string> = {
  month: '이번 달',
  check: '점검',
  plan: '계획',
  records: '기록',
};

export function tabElementId(tab: TabId): string {
  return `tab-${tab}`;
}

/** 탭 패널 id — hash(#month 등)와 겹치면 브라우저가 그 위치로 튀므로 접두어를 붙인다 */
export function tabPanelId(tab: TabId): string {
  return `tabpanel-${tab}`;
}

type TabNavProps = {
  active: TabId;
  onSelect: (tab: TabId) => void;
};

/** 상단 고정 탭 — 방향키·Home·End로 이동 (선택된 탭만 Tab 키 순서에 들어간다) */
export function TabNav({ active, onSelect }: TabNavProps) {
  const buttons = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = tabForKey(active, e.key);
    if (!next) return;
    e.preventDefault();
    onSelect(next);
    buttons.current[next]?.focus();
  };

  return (
    <div className="sticky top-0 z-40 -mx-4 bg-slate-50/90 px-4 py-2 backdrop-blur dark:bg-slate-900/90 sm:mx-0 sm:px-0">
      <div
        role="tablist"
        aria-label="화면"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800 sm:max-w-md"
      >
        {TAB_IDS.map((tab) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              ref={(el) => {
                buttons.current[tab] = el;
              }}
              type="button"
              role="tab"
              id={tabElementId(tab)}
              aria-selected={selected}
              aria-controls={selected ? tabPanelId(tab) : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab)}
              className={`rounded-xl px-2 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                selected
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
