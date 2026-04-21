'use client';

import React, { useMemo, useState } from 'react';
import { Heart, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '../hooks/useToast';

const STORAGE_KEY = 'asset-tracker-emotion-journal';

export type EmotionEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  score: 1 | 2 | 3 | 4 | 5; // 1=공포, 5=탐욕
  action: 'buy' | 'sell' | 'hold';
  note: string;
};

const SCORE_META: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: '극도의 공포', emoji: '😱', color: 'text-blue-600' },
  2: { label: '불안/걱정',   emoji: '😟', color: 'text-sky-500' },
  3: { label: '중립/차분',   emoji: '😐', color: 'text-slate-500' },
  4: { label: '자신감',      emoji: '😊', color: 'text-amber-500' },
  5: { label: '탐욕/FOMO',   emoji: '🤑', color: 'text-rose-500' },
};

type EmotionJournalSectionProps = {
  totalAsset: number;
  formatNum: (n: number) => string;
};

function loadEntries(): EmotionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EmotionEntry[];
  } catch {
    return [];
  }
}

/**
 * 매수/매도/관망 시점의 감정을 기록하는 일기.
 * - 시간이 지나면서 감정 패턴과 실제 결과의 상관관계를 보여줌
 * - 극단 감정(공포/탐욕) 시점의 행동이 좋은 결과였는지 학습
 */
export function EmotionJournalSection({ totalAsset, formatNum }: EmotionJournalSectionProps) {
  const [entries, setEntries] = useState<EmotionEntry[]>(() => loadEntries());
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftScore, setDraftScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [draftAction, setDraftAction] = useState<'buy' | 'sell' | 'hold'>('buy');
  const [draftNote, setDraftNote] = useState('');

  const save = (next: EmotionEntry[]) => {
    setEntries(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // quota
    }
  };

  const handleAdd = () => {
    if (!draftNote.trim()) {
      toast.warning('감정과 이유를 간단히 적어주세요.');
      return;
    }
    const entry: EmotionEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString().slice(0, 10),
      score: draftScore,
      action: draftAction,
      note: draftNote.trim(),
    };
    save([entry, ...entries]);
    setDraftNote('');
    setDraftScore(3);
    setAdding(false);
    toast.success('감정이 기록되었습니다. 나중에 패턴을 확인해보세요.');
  };

  const handleDelete = (id: string) => {
    save(entries.filter((e) => e.id !== id));
    toast.info('감정 기록이 삭제되었습니다.');
  };

  // 감정별 통계
  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const byScore: Record<number, number> = {};
    let fearCount = 0;
    let greedCount = 0;
    for (const e of entries) {
      byScore[e.score] = (byScore[e.score] ?? 0) + 1;
      if (e.score <= 2) fearCount++;
      if (e.score >= 4) greedCount++;
    }
    const avg = entries.reduce((s, e) => s + e.score, 0) / entries.length;
    return { byScore, avg, fearCount, greedCount, total: entries.length };
  }, [entries]);

  return (
    <section className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Heart size={18} className="text-rose-500" />
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
            감정 일기
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            {entries.length}건 기록
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setAdding(!adding); setExpanded(true); }}
            className="px-2 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1"
          >
            <Plus size={12} /> 기록
          </button>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {!expanded && stats && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          평균 감정 점수: <span className="font-black">{stats.avg.toFixed(1)}</span>
          {stats.avg <= 2 && ' — 공포 상태가 많았습니다 (매수 타이밍일 가능성)'}
          {stats.avg >= 4 && ' — 탐욕 상태가 많았습니다 (과열 주의)'}
        </p>
      )}

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* 입력 폼 */}
          {adding && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">지금 감정</p>
                <div className="flex gap-1">
                  {([1, 2, 3, 4, 5] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraftScore(s)}
                      className={`flex-1 p-2 rounded-xl border text-center transition-all ${
                        draftScore === s
                          ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-400 ring-2 ring-rose-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <div className="text-lg">{SCORE_META[s].emoji}</div>
                      <div className="text-[9px] font-bold mt-0.5">{SCORE_META[s].label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">행동</p>
                <div className="flex gap-1">
                  {(['buy', 'sell', 'hold'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setDraftAction(a)}
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold ${
                        draftAction === a
                          ? a === 'buy'
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 ring-2 ring-emerald-400'
                            : a === 'sell'
                            ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-400 ring-2 ring-rose-400'
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-400 ring-2 ring-slate-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {a === 'buy' ? '매수' : a === 'sell' ? '매도' : '관망'}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="왜 이런 감정이 들었는지 한 줄로... (예: 코스피 -5% 급락에 공포)"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setDraftNote(''); }}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 통계 */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <p className="text-[10px] font-bold text-blue-600">공포 (1-2)</p>
                <p className="text-lg font-black text-blue-700">{stats.fearCount}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-[10px] font-bold text-slate-500">평균</p>
                <p className="text-lg font-black text-slate-700 dark:text-slate-200">{stats.avg.toFixed(1)}</p>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20">
                <p className="text-[10px] font-bold text-rose-600">탐욕 (4-5)</p>
                <p className="text-lg font-black text-rose-700">{stats.greedCount}</p>
              </div>
            </div>
          )}

          {/* 현재 자산 */}
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-center">
            <p className="text-[10px] font-bold text-indigo-600 uppercase">현재 자산</p>
            <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">{formatNum(totalAsset)}원</p>
            <p className="text-[10px] text-indigo-500">나중에 이 시점 감정과 결과를 비교해보세요</p>
          </div>

          {/* 기록 목록 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                아직 기록이 없습니다. 매수/매도/관망 시점에 감정을 기록해보세요.
              </p>
            ) : (
              entries.map((e) => {
                const meta = SCORE_META[e.score];
                return (
                  <div
                    key={e.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-start gap-3"
                  >
                    <span className="text-2xl flex-shrink-0">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <span className={meta.color}>{meta.label}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">
                          {e.action === 'buy' ? '매수' : e.action === 'sell' ? '매도' : '관망'}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-400">{e.date}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 break-words">{e.note}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id)}
                      className="flex-shrink-0 text-slate-400 hover:text-rose-500"
                      aria-label="삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
}
