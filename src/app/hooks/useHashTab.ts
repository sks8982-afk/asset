'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_TAB, parseTabHash, type TabId } from '@/lib/tabs';

/** 탭이 바뀌면 맨 위로 — 탭마다 길이가 달라 이전 스크롤 위치가 의미 없다 */
function subscribe(onChange: () => void): () => void {
  const handleHashChange = () => {
    window.scrollTo(0, 0);
    onChange();
  };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}

function getSnapshot(): TabId {
  return parseTabHash(window.location.hash);
}

function getServerSnapshot(): TabId {
  return DEFAULT_TAB;
}

/**
 * 현재 탭 — location.hash(#month 등)와 동기화.
 * 탭을 고르면 hash를 바꾸므로 뒤로 가기로 이전 탭에 돌아갈 수 있다.
 */
export function useHashTab(): [TabId, (tab: TabId) => void] {
  const tab = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const selectTab = useCallback((next: TabId) => {
    if (window.location.hash !== `#${next}`) window.location.hash = next;
  }, []);
  return [tab, selectTab];
}
