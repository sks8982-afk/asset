'use client';

import React, { useState } from 'react';
import { Coins, Plus, ChevronDown, Trash2 } from 'lucide-react';
import type { DividendRecord } from '@/lib/types';

type DividendSectionProps = {
  dividends: DividendRecord[];
  names: Record<string, string>;
  formatNum: (n: number) => string;
  onAddDividend: (dividend: Omit<DividendRecord, 'id'>) => Promise<void>;
  onDeleteDividend: (id: string) => Promise<void>;
};

export function DividendSection({
  dividends,
  names,
  formatNum,
  onAddDividend,
  onDeleteDividend,
}: DividendSectionProps) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
      alert('자산과 배당금을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onAddDividend({
        date,
        asset_key: assetKey,
        amount: Number(amount),
        is_reinvested: isReinvested,
        note,
      });
      setAmount('');
      setNote('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow p-5 space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="font-bold text-base flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-500" />
          배당금 내역
          <span className="text-sm font-normal text-zinc-400">
            (총 {formatNum(totalDividend)}원)
          </span>
        </h2>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-3">
          {/* 연도별 요약 */}
          {Object.keys(byYear).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(byYear)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([year, total]) => (
                  <span
                    key={year}
                    className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium"
                  >
                    {year}년: {formatNum(total)}원
                  </span>
                ))}
            </div>
          )}

          {/* 추가 폼 */}
          {showForm ? (
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500">날짜</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">자산</label>
                  <select
                    value={assetKey}
                    onChange={(e) => setAssetKey(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                  >
                    <option value="">선택</option>
                    {Object.entries(names)
                      .filter(([k]) => k !== 'cash')
                      .map(([k, n]) => (
                        <option key={k} value={k}>{n}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500">배당금 (원)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">메모</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="선택사항"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isReinvested}
                  onChange={(e) => setIsReinvested(e.target.checked)}
                  className="rounded"
                />
                배당 재투자
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-40"
                >
                  {saving ? '저장 중...' : '추가'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              <Plus className="w-4 h-4" /> 배당금 추가
            </button>
          )}

          {/* 배당금 목록 */}
          {dividends.length > 0 ? (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {[...dividends].reverse().map((d) => (
                <div
                  key={d.id ?? `${d.date}-${d.asset_key}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 text-xs">{d.date}</span>
                    <span className="font-medium">{names[d.asset_key] ?? d.asset_key}</span>
                    {d.is_reinvested && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        재투자
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-600">{formatNum(d.amount)}원</span>
                    {d.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('이 배당금 기록을 삭제하시겠습니까?')) {
                            onDeleteDividend(d.id!);
                          }
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-4">
              아직 배당금 기록이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
