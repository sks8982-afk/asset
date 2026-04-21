'use client';

import React, { useState } from 'react';
import { Shield, Edit3, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'asset-tracker-ips';

const DEFAULT_RULES = [
  '월급의 고정 비율을 무조건 적립한다 (시장 상황 무관).',
  'ROI -20% 전까지는 매도하지 않는다.',
  '비중 변경은 3개월에 1회, 분기 리밸런싱 때만 한다.',
  '패닉 매수는 시그널 점수 56점 이상일 때만 허용한다.',
  '하루 수익률에 반응하지 않고 월 단위로만 성과를 본다.',
];

function loadRules(): string[] {
  if (typeof window === 'undefined') return DEFAULT_RULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RULES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((s): s is string => typeof s === 'string');
    }
  } catch {
    // ignore
  }
  return DEFAULT_RULES;
}

/**
 * Investment Policy Statement — 투자 규칙을 메인 화면 상단에 항상 표시.
 * 감정이 흔들릴 때마다 본인이 정한 규칙을 다시 상기시키는 역할.
 */
export function InvestmentPolicySection() {
  const [rules, setRules] = useState<string[]>(() => loadRules());
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState<string>('');

  const startEdit = () => {
    setDraft(rules.join('\n'));
    setEditing(true);
  };

  const saveEdit = () => {
    const next = draft
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (next.length === 0) return;
    setRules(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft('');
    setEditing(false);
  };

  return (
    <section className="bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40 border border-indigo-200 dark:border-indigo-800 rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <div
          className="flex items-center gap-2 cursor-pointer flex-1"
          onClick={() => !editing && setCollapsed(!collapsed)}
        >
          <Shield size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-black tracking-tight text-indigo-900 dark:text-indigo-200">
            나의 투자 규칙 (IPS)
          </h3>
          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-300 bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">
            감정 방어용
          </span>
          {!editing && (
            collapsed
              ? <ChevronDown size={16} className="text-indigo-400 ml-auto" />
              : <ChevronUp size={16} className="text-indigo-400 ml-auto" />
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={saveEdit}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                <Save size={12} /> 저장
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold"
              >
                <X size={12} /> 취소
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-xs font-bold text-indigo-700 dark:text-indigo-300"
            >
              <Edit3 size={12} /> 규칙 수정
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.max(5, draft.split('\n').length)}
          className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs"
          placeholder="한 줄에 하나씩 규칙을 작성하세요"
        />
      ) : !collapsed && (
        <ol className="list-decimal list-inside space-y-1 text-xs text-indigo-900 dark:text-indigo-100 font-medium">
          {rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
