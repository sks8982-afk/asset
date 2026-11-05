'use client';

import React, { useId, useState } from 'react';
import { Coins, Plus, Trash2 } from 'lucide-react';
import type { DividendRecord } from '@/lib/types';
import { todayISO } from '@/lib/date';
import { toast } from '../hooks/useToast';
import { CollapsibleCard } from './ui/CollapsibleCard';
import { INPUT_CLASS, LABEL_CLASS, NOTE_CLASS, PANEL_CLASS, buttonClass } from './ui/styles';

type DividendSectionProps = {
  dividends: DividendRecord[];
  names: Record<string, string>;
  formatNum: (n: number) => string;
  onAddDividend: (dividend: Omit<DividendRecord, 'id'>) => Promise<void>;
  onDeleteDividend: (id: string) => Promise<void>;
};

/** 배당 — 연도별 합계, 기록 추가·삭제 */
export function DividendSection({ dividends, names, formatNum, onAddDividend, onDeleteDividend }: DividendSectionProps) {
  const ids = { date: useId(), asset: useId(), amount: useId(), note: useId() };
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayISO);
  const [assetKey, setAssetKey] = useState('');
  const [amount, setAmount] = useState('');
  const [isReinvested, setIsReinvested] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const totalDividend = dividends.reduce((sum, d) => sum + d.amount, 0);
  const byYear: Record<string, number> = {};
  dividends.forEach((d) => {
    const y = d.date.slice(0, 4);
    byYear[y] = (byYear[y] ?? 0) + d.amount;
  });

  const handleAdd = async () => {
    if (!assetKey || !amount || Number(amount) <= 0) {
      toast.warning('자산과 배당금을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onAddDividend({ date, asset_key: assetKey, amount: Number(amount), is_reinvested: isReinvested, note });
      setAmount('');
      setNote('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CollapsibleCard
      title="배당"
      summary={`총 ${formatNum(totalDividend)}원`}
      icon={<Coins size={18} />}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      <div className="space-y-3">
        {Object.keys(byYear).length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {Object.entries(byYear)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([year, total]) => (
                <li key={year} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tabular-nums text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {year}년 {formatNum(total)}원
                </li>
              ))}
          </ul>
        )}

        {showForm ? (
          <div className={`${PANEL_CLASS} space-y-3`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={ids.date} className={LABEL_CLASS}>날짜</label>
                <input id={ids.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${INPUT_CLASS} mt-1 w-full`} />
              </div>
              <div>
                <label htmlFor={ids.asset} className={LABEL_CLASS}>자산</label>
                <select id={ids.asset} value={assetKey} onChange={(e) => setAssetKey(e.target.value)} className={`${INPUT_CLASS} mt-1 w-full`}>
                  <option value="">선택</option>
                  {Object.entries(names)
                    .filter(([k]) => k !== 'cash')
                    .map(([k, n]) => (
                      <option key={k} value={k}>{n}</option>
                    ))}
                </select>
              </div>
              <div>
                <label htmlFor={ids.amount} className={LABEL_CLASS}>배당금 (원)</label>
                <input
                  id={ids.amount}
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className={`${INPUT_CLASS} mt-1 w-full`}
                />
              </div>
              <div>
                <label htmlFor={ids.note} className={LABEL_CLASS}>메모</label>
                <input
                  id={ids.note}
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="선택"
                  className={`${INPUT_CLASS} mt-1 w-full`}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isReinvested}
                onChange={(e) => setIsReinvested(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
              배당 재투자
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={handleAdd} disabled={saving} className={buttonClass('primary')}>
                {saving ? '저장 중…' : '추가'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={buttonClass('secondary')}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowForm(true)} className={buttonClass('secondary', 'sm')}>
            <Plus size={14} aria-hidden="true" /> 배당 추가
          </button>
        )}

        {dividends.length > 0 ? (
          <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-700/60 dark:border-slate-700">
            {[...dividends].reverse().map((d) => (
              <li key={d.id ?? `${d.date}-${d.asset_key}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                  <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{d.date}</span>
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{names[d.asset_key] ?? d.asset_key}</span>
                  {d.is_reinvested && <span className="text-xs text-slate-500 dark:text-slate-400">재투자</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatNum(d.amount)}원</span>
                  {d.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('이 배당금 기록을 삭제하시겠습니까?')) void onDeleteDividend(d.id as string);
                      }}
                      aria-label={`${d.date} 배당 삭제`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`py-2 text-center ${NOTE_CLASS}`}>아직 배당 기록이 없습니다.</p>
        )}
      </div>
    </CollapsibleCard>
  );
}
