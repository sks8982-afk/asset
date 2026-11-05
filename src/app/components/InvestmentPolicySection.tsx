'use client';

import React, { useId, useState } from 'react';
import { Pencil, Shield } from 'lucide-react';
import { Card } from './ui/Card';
import { INPUT_CLASS, NOTE_CLASS, buttonClass } from './ui/styles';

type InvestmentPolicySectionProps = {
  /** 투자 원칙 문구 (표시용 — 매도 점검 규칙은 따로 고정) */
  rules: string[];
  onSave: (rules: string[]) => void;
};

/** 투자 원칙 — 직접 적어 둔 규칙을 늘 보이게 두고, 필요하면 고친다 */
export function InvestmentPolicySection({ rules, onSave }: InvestmentPolicySectionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaId = useId();

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
    onSave(next);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft('');
    setEditing(false);
  };

  return (
    <Card
      title="투자 원칙"
      icon={<Shield size={18} />}
      actions={
        editing ? null : (
          <button type="button" onClick={startEdit} className={buttonClass('secondary', 'sm')}>
            <Pencil size={14} aria-hidden="true" /> 수정
          </button>
        )
      }
    >
      {editing ? (
        <>
          <label htmlFor={textareaId} className="sr-only">
            투자 원칙 (한 줄에 하나)
          </label>
          <textarea
            id={textareaId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(4, draft.split('\n').length)}
            placeholder="한 줄에 하나씩 적으세요"
            className={`${INPUT_CLASS} w-full`}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={cancelEdit} className={buttonClass('secondary', 'sm')}>
              취소
            </button>
            <button type="button" onClick={saveEdit} className={buttonClass('primary', 'sm')}>
              저장
            </button>
          </div>
        </>
      ) : (
        <>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700 marker:font-semibold marker:text-slate-400 dark:text-slate-200">
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
          <p className={`mt-3 ${NOTE_CLASS}`}>
            문구는 표시용입니다. 매도할 때는 손실 중인 코어 매도 · 감정 사유 · 잦은 매도를 따로 점검합니다.
          </p>
        </>
      )}
    </Card>
  );
}
