'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'asset-tracker-hide-returns';

/**
 * 일일 수익률을 가리는 토글 (감정 방어).
 * 활성화 시 % 대신 "***" 표시.
 */
export function useHideReturns(): [boolean, (v: boolean) => void] {
  const [hide, setHide] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(hide));
  }, [hide]);

  return [hide, setHide];
}

/** 수익률 마스킹 포맷터 */
export function maskReturn(value: string, hide: boolean): string {
  if (!hide) return value;
  return '***';
}
