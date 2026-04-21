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
      return raw ? (JSON.parse(raw) as RebalancingSnapshotEntry[]) : [];
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
