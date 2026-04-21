'use client';

import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

export function useDarkMode(): [boolean, (v: boolean) => void] {
  const [darkMode, setDarkMode] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem(STORAGE_KEYS.dark) === 'true',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(STORAGE_KEYS.dark, String(darkMode));
  }, [darkMode]);

  return [darkMode, setDarkMode];
}
