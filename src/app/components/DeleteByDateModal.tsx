'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { NOTE_CLASS, buttonClass } from './ui/styles';

export type RecordBatchItem = {
  key: string;
  date: string;
  batchId: string | null;
  count: number;
  /** 그중 매도 기록 수 */
  sellCount: number;
  /** 같은 날 몇 번째 저장인지 (1차·2차…) */
  nth: number;
};

type DeleteByDateModalProps = {
  open: boolean;
  onClose: () => void;
  /** 날짜+배치별 기록 (같은 날 여러 번 저장한 것을 차수별로 표시) */
  recordBatches: RecordBatchItem[];
  selectedKeys: string[];
  onToggleBatch: (key: string) => void;
  /** 삭제 실행 (확인 창은 호출하는 쪽에서 띄움) */
  onConfirm: () => void;
  isDeleting: boolean;
};

export function DeleteByDateModal({
  open,
  onClose,
  recordBatches,
  selectedKeys,
  onToggleBatch,
  onConfirm,
  isDeleting,
}: DeleteByDateModalProps) {
  if (!open) return null;

  return (
    <Modal
      title="기록 삭제"
      icon={<Trash2 size={18} className="text-rose-500" />}
      onClose={onClose}
      size="sm"
    >
      <p className={NOTE_CLASS}>
        같은 날 여러 번 저장한 경우 차수별로 나뉩니다. 삭제할 차수를 고르세요. 삭제 전에 한 번 더 확인합니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {recordBatches.map((b) => {
          const checked = selectedKeys.includes(b.key);
          return (
            <label
              key={b.key}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-500 ${
                checked
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200'
              }`}
            >
              <input type="checkbox" checked={checked} onChange={() => onToggleBatch(b.key)} className="sr-only" />
              {b.date} ({b.nth}차, {b.count}건{b.sellCount > 0 ? ` · 매도 ${b.sellCount}` : ''})
            </label>
          );
        })}
      </div>
      {recordBatches.length === 0 && (
        <p className="py-2 text-sm text-slate-500 dark:text-slate-400">삭제할 수 있는 기록이 없습니다.</p>
      )}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onClose} className={buttonClass('secondary', 'md', 'flex-1')}>
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting || selectedKeys.length === 0}
          className={buttonClass('danger', 'md', 'flex-1')}
        >
          {isDeleting ? '삭제 중…' : `선택 삭제 (${selectedKeys.length}개)`}
        </button>
      </div>
    </Modal>
  );
}
