'use client';

import { useEffect, useState } from 'react';

/**
 * localStorage에 number를 동기화하는 훅.
 * - 초기값은 localStorage에서 로드 (없으면 fallback)
 * - 값 변경 시 유효한 finite, >= minValue 인 경우에만 저장
 */
export function useLocalStorageNumber(
  key: string,
  fallback: number,
  minValue: number = 0,
): [number, (v: number) => void] {
  const [value, setValue] = useState<number>(() => {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  });

  useEffect(() => {
    if (Number.isFinite(value) && value >= minValue) {
      localStorage.setItem(key, String(value));
    }
  }, [key, value, minValue]);

  return [value, setValue];
}
