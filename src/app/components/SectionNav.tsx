'use client';

import React from 'react';

const SECTIONS = [
  { id: 'section-monthly', label: '이번 달' },
  { id: 'section-portfolio', label: '자산 점검' },
  { id: 'section-mindset', label: '마인드셋' },
  { id: 'section-tax', label: '세금·배당' },
  { id: 'section-goals', label: '목표·기록' },
];

/** 섹션 그룹 앵커 네비게이션 — 상단 고정 바 */
export function SectionNav() {
  return (
    <nav className="sticky top-2 z-40 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-2 py-1.5 shadow">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() =>
            document
              .getElementById(s.id)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className="whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
