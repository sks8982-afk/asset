'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

/** 같은 목표 알림을 다시 띄우기까지의 간격 */
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

type CooldownSnapshot = { openedAt: number; shownAt: number };

/** 화면을 연 시각과 마지막 표시 시각 (열 때 한 번만 읽는다) */
function readCooldownSnapshot(): CooldownSnapshot {
  if (typeof window === 'undefined') return { openedAt: 0, shownAt: 0 };
  let shownAt = 0;
  try {
    shownAt = Number(localStorage.getItem(STORAGE_KEYS.goalAssetShown)) || 0;
  } catch {
    shownAt = 0;
  }
  return { openedAt: Date.now(), shownAt };
}

type GoalToastInput = {
  /** 계좌 데이터가 준비됐는지 */
  ready: boolean;
  totalAsset: number;
  goalAsset: number;
};

/**
 * 목표 자산 도달 알림.
 * 24시간에 한 번만 띄운다 (마지막 표시 시각은 localStorage).
 * 쿨다운은 화면을 연 시점 기준으로 판단해, 띄운 알림은 닫을 때까지 유지된다.
 */
export function useGoalToast({ ready, totalAsset, goalAsset }: GoalToastInput): {
  goalToast: boolean;
  closeGoalToast: () => void;
} {
  const [cooldown] = useState<CooldownSnapshot>(readCooldownSnapshot);
  const [dismissed, setDismissed] = useState(false);

  const goalToast = useMemo(
    () => ready && !dismissed && goalAsset > 0 && totalAsset >= goalAsset
      && cooldown.openedAt - cooldown.shownAt > COOLDOWN_MS,
    [ready, dismissed, goalAsset, totalAsset, cooldown],
  );

  useEffect(() => {
    if (!goalToast) return;
    try {
      localStorage.setItem(STORAGE_KEYS.goalAssetShown, String(Date.now()));
    } catch {
      // 저장 실패 시 다음 방문에 다시 뜰 뿐
    }
  }, [goalToast]);

  const closeGoalToast = useCallback(() => setDismissed(true), []);

  return { goalToast, closeGoalToast };
}
