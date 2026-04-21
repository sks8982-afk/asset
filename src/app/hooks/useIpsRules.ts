'use client';

import { useState } from 'react';

const STORAGE_KEY = 'asset-tracker-ips';

const DEFAULT_RULES = [
  '월급의 고정 비율을 무조건 적립한다 (시장 상황 무관).',
  'ROI -20% 전까지는 매도하지 않는다.',
  '비중 변경은 3개월에 1회, 분기 리밸런싱 때만 한다.',
  '패닉 매수는 시그널 점수 56점 이상일 때만 허용한다.',
  '하루 수익률에 반응하지 않고 월 단위로만 성과를 본다.',
];

function loadRules(): string[] {
  if (typeof window === 'undefined') return DEFAULT_RULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RULES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((s): s is string => typeof s === 'string');
    }
  } catch {
    // ignore
  }
  return DEFAULT_RULES;
}

/**
 * localStorage의 IPS 규칙을 읽어오는 훅.
 * InvestmentPolicySection과 공유하는 스토리지 키를 사용.
 */
export function useIpsRules(): string[] {
  const [rules] = useState<string[]>(() => loadRules());
  return rules;
}

/**
 * 매도 시도와 IPS 규칙을 체크.
 * 매도 관련 조건/금지 규칙을 자연어 파싱으로 검출.
 */
export type IpsViolation = {
  rule: string;
  reason: string;
  severity: 'high' | 'medium';
};

type SellContext = {
  currentRoi: number; // 전체 ROI %
  assetRoi: number; // 해당 자산 ROI %
  assetKey: string;
  isQuarterMonth: boolean; // 3/6/9/12월 여부
  sellReason: string; // 사용자가 선택한 사유
  recentSellCount30d: number; // 최근 30일 매도 횟수
};

export function checkIpsViolations(
  rules: string[],
  ctx: SellContext,
): IpsViolation[] {
  const violations: IpsViolation[] = [];

  for (const rule of rules) {
    const lower = rule.toLowerCase();

    // "ROI -N% 전까지 매도 금지" 패턴
    const roiMatch = rule.match(/-?\s*(\d+)\s*%/);
    if (roiMatch && (lower.includes('매도') && (lower.includes('전까지') || lower.includes('전에') || lower.includes('이하') || lower.includes('전')))) {
      const threshold = -Math.abs(Number(roiMatch[1]));
      if (ctx.currentRoi > threshold && ctx.assetRoi > threshold) {
        violations.push({
          rule,
          reason: `전체 ROI ${ctx.currentRoi.toFixed(1)}% · 자산 ROI ${ctx.assetRoi.toFixed(1)}% — 규칙상 매도 금지 기준(${threshold}%) 미달`,
          severity: 'high',
        });
      }
    }

    // "분기 리밸런싱 때만" 패턴
    if (
      (lower.includes('분기') && lower.includes('리밸런싱')) ||
      lower.includes('3개월에 1회')
    ) {
      if (!ctx.isQuarterMonth && ctx.sellReason !== 'rebalancing') {
        violations.push({
          rule,
          reason: `지금은 분기 말(3/6/9/12월)이 아니며 리밸런싱 사유도 아닙니다`,
          severity: 'medium',
        });
      }
    }

    // "매도/거래 N회 이내" 패턴 (과다거래)
    const countMatch = rule.match(/(\d+)\s*회/);
    if (countMatch && lower.includes('매도')) {
      const limit = Number(countMatch[1]);
      if (ctx.recentSellCount30d >= limit) {
        violations.push({
          rule,
          reason: `최근 30일 매도 ${ctx.recentSellCount30d}회 — 규칙상 한도 ${limit}회 초과`,
          severity: 'high',
        });
      }
    }

    // "감정에 반응하지 않는다" 등 감정 매도 금지 규칙
    if (
      (lower.includes('감정') || lower.includes('공포') || lower.includes('패닉')) &&
      (lower.includes('매도') || lower.includes('반응'))
    ) {
      if (ctx.sellReason === 'other') {
        violations.push({
          rule,
          reason: `매도 사유가 "기타(감정 포함)"로 선택됨 — 감정 매도 금지 규칙 위반`,
          severity: 'high',
        });
      }
    }
  }

  return violations;
}
