'use client';

import React, { useId, useMemo, useState } from 'react';
import { Heart, Plus, Trash2 } from 'lucide-react';
import { todayISO } from '@/lib/date';
import { toast } from '../hooks/useToast';
import { CollapsibleCard } from './ui/CollapsibleCard';
import { INPUT_CLASS, LABEL_CLASS, NOTE_CLASS, PANEL_CLASS, buttonClass } from './ui/styles';

/** 이 기기에만 저장 (localStorage) */
const STORAGE_KEY = 'asset-tracker-emotion-journal';

type Score = 1 | 2 | 3 | 4 | 5;
type Action = 'buy' | 'sell' | 'hold';

type EmotionEntry = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** 1 = 공포, 5 = 탐욕 */
  score: Score;
  action: Action;
  note: string;
};

const SCORES: readonly Score[] = [1, 2, 3, 4, 5];
const SCORE_LABELS: Record<Score, string> = {
  1: '극도의 공포',
  2: '불안/걱정',
  3: '중립/차분',
  4: '자신감',
  5: '탐욕/FOMO',
};
const ACTIONS: readonly Action[] = ['buy', 'sell', 'hold'];
const ACTION_LABELS: Record<Action, string> = { buy: '매수', sell: '매도', hold: '관망' };

const CHOICE_CLASS = 'rounded-xl border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500';
const CHOICE_ON = 'border-blue-400 bg-blue-50 text-blue-800 ring-1 ring-blue-400 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200';
const CHOICE_OFF = 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';

/** 감정 점수 동그라미 — 양 극단(1·5)만 amber로 */
function ScoreDot({ score }: { score: Score }) {
  const tone = score === 1 || score === 5
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
  return (
    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`} aria-hidden="true">
      {score}
    </span>
  );
}

function loadEntries(): EmotionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EmotionEntry[]) : [];
  } catch {
    return [];
  }
}

type EmotionJournalSectionProps = {
  totalAsset: number;
  formatNum: (n: number) => string;
};

/** 감정 일기 — 매수·매도·관망할 때의 감정을 적어 두고 나중에 결과와 비교 (기본은 접힘) */
export function EmotionJournalSection({ totalAsset, formatNum }: EmotionJournalSectionProps) {
  const noteId = useId();
  const [entries, setEntries] = useState<EmotionEntry[]>(loadEntries);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftScore, setDraftScore] = useState<Score>(3);
  const [draftAction, setDraftAction] = useState<Action>('buy');
  const [draftNote, setDraftNote] = useState('');

  const save = (next: EmotionEntry[]) => {
    setEntries(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      toast.error('이 기기에 저장하지 못했습니다.');
    }
  };

  const handleAdd = () => {
    if (!draftNote.trim()) {
      toast.warning('감정과 이유를 간단히 적어주세요.');
      return;
    }
    const entry: EmotionEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: todayISO(),
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

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    return {
      avg: entries.reduce((s, e) => s + e.score, 0) / entries.length,
      fear: entries.filter((e) => e.score <= 2).length,
      greed: entries.filter((e) => e.score >= 4).length,
    };
  }, [entries]);

  return (
    <CollapsibleCard
      title="감정 일기"
      summary={stats ? `${entries.length}건 · 평균 ${stats.avg.toFixed(1)}점 (1 공포 ~ 5 탐욕)` : '이 기기에만 저장됩니다'}
      icon={<Heart size={18} />}
      open={open}
      onToggle={() => setOpen(!open)}
      actions={
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setOpen(true);
          }}
          className={buttonClass('secondary', 'sm')}
        >
          <Plus size={14} aria-hidden="true" /> 기록
        </button>
      }
    >
      <div className="space-y-4">
        {adding && (
          <div className={`${PANEL_CLASS} space-y-3`}>
            <fieldset>
              <legend className={`mb-2 ${LABEL_CLASS}`}>지금 감정</legend>
              <div className="grid grid-cols-5 gap-1.5">
                {SCORES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={draftScore === s}
                    onClick={() => setDraftScore(s)}
                    className={`${CHOICE_CLASS} flex flex-col items-center gap-1 ${draftScore === s ? CHOICE_ON : CHOICE_OFF}`}
                  >
                    <ScoreDot score={s} />
                    {/* 좁은 칸에서는 낱말 중간이 아니라 '/' 뒤에서만 줄을 바꾼다 */}
                    <span className="break-keep text-[11px] leading-tight">{SCORE_LABELS[s].replace('/', '/​')}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className={`mb-2 ${LABEL_CLASS}`}>행동</legend>
              <div className="grid grid-cols-3 gap-1.5">
                {ACTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={draftAction === a}
                    onClick={() => setDraftAction(a)}
                    className={`${CHOICE_CLASS} ${draftAction === a ? CHOICE_ON : CHOICE_OFF}`}
                  >
                    {ACTION_LABELS[a]}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor={noteId} className={LABEL_CLASS}>이유</label>
              <textarea
                id={noteId}
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="왜 이런 감정이 들었는지 한 줄로 (예: 코스피 -5% 급락에 공포)"
                rows={2}
                className={`${INPUT_CLASS} mt-1 w-full`}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleAdd} className={buttonClass('primary', 'md', 'flex-1')}>
                저장
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setDraftNote('');
                }}
                className={buttonClass('secondary')}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {stats && (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className={`${PANEL_CLASS} px-2 py-3`}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">공포 (1–2)</dt>
              <dd className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{stats.fear}</dd>
            </div>
            <div className={`${PANEL_CLASS} px-2 py-3`}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">평균</dt>
              <dd className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{stats.avg.toFixed(1)}</dd>
            </div>
            <div className={`${PANEL_CLASS} px-2 py-3`}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">탐욕 (4–5)</dt>
              <dd className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{stats.greed}</dd>
            </div>
          </dl>
        )}

        <p className={NOTE_CLASS}>
          현재 자산 <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatNum(totalAsset)}원</span>
          {' '}— 나중에 이 시점의 감정과 결과를 비교해 보세요.
        </p>

        {entries.length === 0 ? (
          <p className={`py-2 text-center ${NOTE_CLASS}`}>아직 기록이 없습니다. 매수·매도·관망할 때 감정을 적어 보세요.</p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <ScoreDot score={e.score} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{SCORE_LABELS[e.score]}</span>
                    {' · '}{ACTION_LABELS[e.action]}{' · '}<span className="tabular-nums">{e.date}</span>
                  </p>
                  <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-200">{e.note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(e.id)}
                  aria-label="감정 기록 삭제"
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CollapsibleCard>
  );
}
