'use client';

import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, X } from 'lucide-react';
import type { PolicyViolation } from '@/lib/ips';

/** 진행 버튼이 켜지기까지 기다리는 시간 (초) */
const COOLDOWN_SECONDS = 30;

type IpsViolationModalProps = {
  open: boolean;
  violations: PolicyViolation[];
  /** 내가 적어 둔 투자 규칙 문구 */
  policyRules: string[];
  onProceed: () => void;
  onCancel: () => void;
};

/**
 * 매도 시도가 IPS 점검(lib/ips)에 걸릴 때 띄우는 경고 모달.
 * - 위반 내용 + 내가 적어 둔 규칙 문구 표시
 * - "그럼에도 진행하겠습니다" 체크박스 + 30초 카운트다운으로 즉흥 결정 방지
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-400 dark:border-rose-700 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className={`p-5 border-b ${hasHigh ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={22} className={hasHigh ? 'text-rose-600' : 'text-amber-600'} />
              <div>
                <h3 className={`text-sm font-black ${hasHigh ? 'text-rose-800 dark:text-rose-200' : 'text-amber-800 dark:text-amber-200'}`}>
                  ⚠️ 본인 규칙(IPS) 위반 감지
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  이 매도는 당신이 직접 세운 투자 규칙에 어긋납니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* 위반 내용 */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">위반 내용</p>
            <div className="space-y-2">
              {violations.map((v) => (
                <div
                  key={v.code}
                  className={`p-3 rounded-xl border ${
                    v.severity === 'high'
                      ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                  }`}
                >
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                    {v.severity === 'high' ? '🚫' : '⚠️'} {v.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 전체 규칙 곱씹기 */}
          {policyRules.length > 0 && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-indigo-600" />
                <p className="text-[11px] font-black text-indigo-800 dark:text-indigo-200 uppercase">
                  당신이 직접 세운 전체 규칙
                </p>
              </div>
              <ol className="list-decimal list-inside text-[11px] text-indigo-900 dark:text-indigo-100 space-y-1">
                {policyRules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>
          )}

          {/* 심리학 경고 */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
            <p className="font-bold">🧠 지금 당신의 심리 상태를 체크하세요</p>
            <p>• 뉴스나 SNS 때문에 두려워진 것은 아닌가?</p>
            <p>• 며칠만 지나면 이 결정을 후회할 가능성은?</p>
            <p>• &ldquo;이번 한 번만&rdquo;이라는 생각은 반복의 시작이 아닐까?</p>
            <p className="text-[10px] text-slate-500 mt-2 italic">
              📚 Dalbar QAIB 2024: 평균 투자자는 시장 대비 연 -4% 언더퍼폼, 주 원인은 &quot;규칙 위반 매도&quot;
            </p>
          </div>

          {/* 확인 절차 */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
            <label className="flex items-start gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="w-4 h-4 mt-0.5"
              />
              <span>
                위 규칙을 모두 읽었으며, 그럼에도 이 매도가 필요하다고 판단합니다.
              </span>
            </label>
          </div>

          {countdown > 0 && (
            <p className="text-center text-[11px] text-slate-500">
              ⏱ 진행까지 <span className="font-black text-rose-500">{countdown}초</span> — 그 사이 다시 한번 생각해보세요
            </p>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm"
            >
              ✋ 규칙대로 매도 취소
            </button>
            <button
              type="button"
              onClick={onProceed}
              disabled={!canProceed}
              className="flex-1 px-4 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `${countdown}초 후 진행` : acknowledged ? '규칙 위반 매도 진행' : '체크 필요'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
