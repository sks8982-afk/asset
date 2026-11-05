'use client';

import { useCallback, useState } from 'react';
import { DEFAULT_POLICY_RULES } from '@/lib/ips';

/**
 * 투자 원칙 문구 저장 키.
 * 예전 키('asset-tracker-ips')에 남은 기본 규칙('ROI -20% 전까지는 매도하지 않는다' — 사실상 손절 기준)이
 * 다시 보이지 않도록 새 키를 쓴다.
 */
const STORAGE_KEY = 'asset-tracker-ips-v2';

function loadRules(): string[] {
  if (typeof window === 'undefined') return DEFAULT_POLICY_RULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_POLICY_RULES;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const rules = parsed.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
      if (rules.length > 0) return rules;
    }
  } catch {
    // 손상된 값은 기본 문구로
  }
  return DEFAULT_POLICY_RULES;
}

/**
 * 투자 원칙 문구 (화면 표시용).
 * 매도 점검은 문구와 상관없이 lib/ips의 checkSellAgainstPolicy가 한다.
 */
export function useIpsRules(): [string[], (rules: string[]) => void] {
  const [rules, setRules] = useState<string[]>(loadRules);

  const saveRules = useCallback((next: string[]) => {
    setRules(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 공간 부족 등 — 화면 값은 유지
    }
  }, []);

  return [rules, saveRules];
}
