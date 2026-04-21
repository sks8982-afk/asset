'use client';

import { useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

/**
 * 분기(3/6/9/12월) 진입 시 리밸런싱 배너 표시 여부 관리.
 * - 해당 분기를 이미 본 적이 있으면 false
 * - STORAGE_KEYS.rebalancingAlertQuarter에 YYYY-Qn 저장
 */
export function useQuarterlyRebalancingBanner(): [boolean, (v: boolean) => void] {
  const [show, setShow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const now = new Date();
    const m = now.getMonth() + 1;
    if (![3, 6, 9, 12].includes(m)) return false;
    const y = now.getFullYear();
    const q = Math.ceil(m / 3);
    const quarterKey = `${y}-Q${q}`;
    const shown = localStorage.getItem(STORAGE_KEYS.rebalancingAlertQuarter);
    return shown !== quarterKey;
  });

  return [show, setShow];
}
