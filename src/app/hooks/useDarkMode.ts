'use client';

import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

/**
 * 다크모드 훅.
 * 우선순위:
 *   1. localStorage에 저장된 사용자 명시 선택
 *   2. 시스템 환경설정 (prefers-color-scheme: dark)
 *   3. 기본값 true (이 앱은 다크 테마 중심으로 디자인됨)
 */
function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(STORAGE_KEYS.dark);
  if (saved === 'true') return true;
  if (saved === 'false') return false;
  // 사용자가 설정한 적 없으면 시스템 환경설정 따름
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return true;
  // 시스템도 라이트면 기본값 다크 (앱 디자인 의도)
  return true;
}

export function useDarkMode(): [boolean, (v: boolean) => void] {
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(STORAGE_KEYS.dark, String(darkMode));
  }, [darkMode]);

  return [darkMode, setDarkMode];
}
