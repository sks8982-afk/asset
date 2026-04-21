'use client';

import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

/**
 * 사용자 커스텀 자산 비중을 localStorage에 동기화.
 * - 초기값을 lazy initializer로 로드 (SSR 안전)
 * - null로 설정하면 스토리지에서 제거
 */
export function useCustomRatios(): [
  Record<string, number> | null,
  React.Dispatch<React.SetStateAction<Record<string, number> | null>>,
] {
  const [ratios, setRatios] = useState<Record<string, number> | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEYS.ratios);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, number>;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (ratios) {
      localStorage.setItem(STORAGE_KEYS.ratios, JSON.stringify(ratios));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ratios);
    }
  }, [ratios]);

  return [ratios, setRatios];
}
