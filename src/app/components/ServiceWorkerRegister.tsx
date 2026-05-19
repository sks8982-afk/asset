'use client';

import { useEffect } from 'react';

/**
 * Service Worker 등록 컴포넌트.
 * production 환경에서만 등록 (dev에서는 캐시 문제 방지).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // 등록 실패 시 무시 (PWA는 옵션이므로)
      }
    };

    register();
  }, []);

  return null;
}
