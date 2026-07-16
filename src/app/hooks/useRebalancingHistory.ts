'use client';

import { useState } from 'react';
import type { RebalancingItem } from '@/lib/types';

const STORAGE_KEY = 'asset-tracker-rebalancing-history';

export type RebalancingSnapshotEntry = {
  date: string;
  totalAsset: number;
  items: RebalancingItem[];
};

export function useRebalancingHistory(): [
  RebalancingSnapshotEntry[],
  (next: RebalancingSnapshotEntry[]) => void,
] {
  const [history, setHistory] = useState<RebalancingSnapshotEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as RebalancingSnapshotEntry[]) : [];
      // 과거 버그(비중 100배 저장)로 남은 스냅샷 정규화 — 비중은 100%를 넘을 수 없음
      return parsed.map((entry) => ({
        ...entry,
        items: entry.items.map((item) =>
          item.currentWeight > 100
            ? { ...item, currentWeight: Math.round(item.currentWeight) / 100 }
            : item,
        ),
      }));
    } catch {
      return [];
    }
  });

  const save = (next: RebalancingSnapshotEntry[]) => {
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
  };

  return [history, save];
}
