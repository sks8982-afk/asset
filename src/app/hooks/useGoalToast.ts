'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

export type GoalToastKind = 'roi' | 'asset';

/** 같은 목표 알림을 다시 띄우기까지의 간격 */
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const SHOWN_AT_KEYS: Record<GoalToastKind, string> = {
  roi: STORAGE_KEYS.goalRoiShown,
  asset: STORAGE_KEYS.goalAssetShown,
};

type CooldownSnapshot = { openedAt: number } & Record<GoalToastKind, number>;

function readShownAt(kind: GoalToastKind): number {
  try {
    return Number(localStorage.getItem(SHOWN_AT_KEYS[kind])) || 0;
  } catch {
    return 0;
  }
}

/** 화면을 연 시각과 알림별 마지막 표시 시각 (열 때 한 번만 읽는다) */
function readCooldownSnapshot(): CooldownSnapshot {
  if (typeof window === 'undefined') return { openedAt: 0, roi: 0, asset: 0 };
  return { openedAt: Date.now(), roi: readShownAt('roi'), asset: readShownAt('asset') };
}

type GoalToastInput = {
  /** 계좌 데이터가 준비됐는지 */
  ready: boolean;
  /** 현재 총수익률 % */
  roi: number;
  totalAsset: number;
  goalRoi: number;
  goalAsset: number;
};

/**
 * 목표 도달 알림 — ROI 목표가 먼저, 닫으면 자산 목표.
 * 같은 알림은 24시간에 한 번만 띄운다 (마지막 표시 시각은 localStorage).
 * 쿨다운은 화면을 연 시점 기준으로 판단해, 띄운 알림은 닫을 때까지 유지된다.
 */
export function useGoalToast({ ready, roi, totalAsset, goalRoi, goalAsset }: GoalToastInput): {
  goalToast: GoalToastKind | null;
  closeGoalToast: () => void;
} {
  const [cooldown] = useState<CooldownSnapshot>(readCooldownSnapshot);
  const [dismissed, setDismissed] = useState<readonly GoalToastKind[]>([]);

  const goalToast = useMemo((): GoalToastKind | null => {
    if (!ready) return null;
    const eligible = (kind: GoalToastKind): boolean =>
      !dismissed.includes(kind) && cooldown.openedAt - cooldown[kind] > COOLDOWN_MS;
    if (goalRoi > 0 && roi >= goalRoi && eligible('roi')) return 'roi';
    if (goalAsset > 0 && totalAsset >= goalAsset && eligible('asset')) return 'asset';
    return null;
  }, [ready, roi, totalAsset, goalRoi, goalAsset, dismissed, cooldown]);

  useEffect(() => {
    if (!goalToast) return;
    try {
      localStorage.setItem(SHOWN_AT_KEYS[goalToast], String(Date.now()));
    } catch {
      // 저장 실패 시 다음 방문에 다시 뜰 뿐
    }
  }, [goalToast]);

  const closeGoalToast = useCallback(() => {
    if (goalToast) setDismissed((prev) => [...prev, goalToast]);
  }, [goalToast]);

  return { goalToast, closeGoalToast };
}
