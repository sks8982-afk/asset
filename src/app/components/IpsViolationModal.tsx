'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import type { PolicyViolation } from '@/lib/ips';
import { Modal } from './ui/Modal';
import { NOTICE_CLASS, PANEL_CLASS, buttonClass } from './ui/styles';

/** 진행 버튼이 켜지기까지 기다리는 시간 (초) */
const COOLDOWN_SECONDS = 30;

type IpsViolationModalProps = {
  open: boolean;
  violations: PolicyViolation[];
  /** 내가 적어 둔 투자 규칙 문구 */
  policyRules: string[];
  onProceed: () => void;
  onCancel: () => void;
  /** 매도 기록 저장 중 — 두 번 누르지 않도록 버튼을 막는다 */
  isSaving: boolean;
};

/**
 * 매도 시도가 IPS 점검(lib/ips)에 걸릴 때 띄우는 경고 창.
 * - 위반 내용 + 내가 적어 둔 규칙 문구 표시
 * - "그럼에도 진행하겠습니다" 체크 + 30초 카운트다운으로 즉흥 결정 방지
 * 열 때마다 새로 마운트해 체크·카운트다운을 초기화한다.
 */
export function IpsViolationModal({ open, ...props }: IpsViolationModalProps) {
  if (!open) return null;
  return <IpsViolationModalBody {...props} />;
}

function IpsViolationModalBody({
  violations,
  policyRules,
  onProceed,
  onCancel,
  isSaving,
}: Omit<IpsViolationModalProps, 'open'>) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [countdown, setCountdown] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const hasHigh = violations.some((v) => v.severity === 'high');
  const canProceed = acknowledged && countdown <= 0;

  return (
    <Modal
      title="투자 원칙 점검"
      subtitle="이 매도는 직접 세운 투자 원칙에 어긋납니다."
      icon={<AlertTriangle size={18} className={hasHigh ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'} />}
      onClose={onCancel}
      closeOnBackdrop={false}
      elevated
      size="lg"
      className={hasHigh ? 'border-rose-300 dark:border-rose-900' : 'border-amber-300 dark:border-amber-900'}
    >
      <div className="space-y-4">
        <section>
          <h3 className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">걸린 항목</h3>
          <ul className="space-y-2">
            {violations.map((v) => (
              <li
                key={v.code}
                className={`rounded-xl border p-3 text-sm font-semibold ${
                  v.severity === 'high'
                    ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
                    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
                }`}
              >
                {v.message}
              </li>
            ))}
          </ul>
        </section>

        {policyRules.length > 0 && (
          <section className={PANEL_CLASS}>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Shield size={14} aria-hidden="true" /> 직접 세운 투자 원칙
            </h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
              {policyRules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </section>
        )}

        <section className={`${PANEL_CLASS} space-y-1 text-sm text-slate-700 dark:text-slate-200`}>
          <h3 className="font-semibold">지금 마음 상태를 확인해 보세요</h3>
          <p>뉴스나 SNS 때문에 두려워진 것은 아닌가?</p>
          <p>며칠만 지나면 이 결정을 후회할 가능성은?</p>
          <p>&ldquo;이번 한 번만&rdquo;이라는 생각은 반복의 시작이 아닐까?</p>
        </section>

        <label className={`flex cursor-pointer items-start gap-2 font-semibold ${NOTICE_CLASS}`}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-600"
          />
          <span>위 원칙을 모두 읽었으며, 그럼에도 이 매도가 필요하다고 판단합니다.</span>
        </label>

        {countdown > 0 && (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            진행까지 <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">{countdown}초</span> — 그 사이 다시 한번 생각해 보세요
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel} disabled={isSaving} className={buttonClass('primary', 'md', 'flex-1 py-3')}>
            원칙대로 매도 취소
          </button>
          <button
            type="button"
            onClick={onProceed}
            disabled={!canProceed || isSaving}
            className={buttonClass('danger', 'md', 'flex-1 py-3')}
          >
            {isSaving
              ? '저장 중…'
              : countdown > 0 ? `${countdown}초 후 진행` : acknowledged ? '원칙과 다르게 매도' : '확인 체크 필요'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
