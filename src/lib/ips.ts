/**
 * 투자 원칙(IPS) 점검 — 매도 시도를 구조화된 사유로 점검한다 (자연어 규칙 파싱 대체).
 */
import { isCoreAsset } from './assets';

export type SellReason = 'rebalancing' | 'simplify' | 'goal_reached' | 'emergency_cash' | 'other';

export const SELL_REASON_LABELS: Record<SellReason, string> = {
  rebalancing: '리밸런싱',
  simplify: '보유 종목 정리',
  goal_reached: '목표 달성',
  emergency_cash: '긴급 자금',
  other: '기타',
};

export type PolicyViolation = {
  code: string;
  message: string;
  severity: 'high' | 'medium';
};

export type SellCheckInput = {
  assetKey: string;
  /** 해당 자산 수익률 % */
  assetRoi: number;
  reason: SellReason;
  /** 이번 매도를 빼고 최근 30일 매도 횟수 */
  recentSellCount30d: number;
};

/** 화면에 보여 줄 투자 원칙 3줄 */
export const DEFAULT_POLICY_RULES: string[] = [
  '매달 정한 금액을 S&P500 70 : 나스닥100 30으로 산다. 시장 상황과 뉴스는 보지 않는다.',
  '하락은 매도 이유가 아니다. 리밸런싱이나 목적 변경이 아니면 팔지 않는다.',
  '비중은 새로 넣는 돈으로 맞춘다. 새 테마·개별 종목은 사지 않고, 비상금은 투자하지 않는다.',
];

/** 최근 30일 매도가 이 횟수 이상이면 과다 거래 */
const OVERTRADING_SELL_COUNT = 2;

/** 과다 거래 점검에서 빼는 사유 (계획된 정리·리밸런싱) */
const PLANNED_SELL_REASONS: readonly SellReason[] = ['simplify', 'rebalancing'];

/**
 * 매도 점검. 위반이 없으면 빈 배열.
 * 1. 손실 중인 코어 자산을 리밸런싱 외 사유로 매도 → high
 * 2. 사유 '기타' → high (감정 매도 의심)
 * 3. 최근 30일 매도 2회 이상 + 계획된 사유(정리·리밸런싱) 아님 → medium
 */
export function checkSellAgainstPolicy({
  assetKey,
  assetRoi,
  reason,
  recentSellCount30d,
}: SellCheckInput): PolicyViolation[] {
  const rules: { applies: boolean; violation: PolicyViolation }[] = [
    {
      applies: isCoreAsset(assetKey) && assetRoi < 0 && reason !== 'rebalancing',
      violation: {
        code: 'core_loss_sell',
        message: '손실 중인 코어 자산 매도 — 하락은 매도 이유가 아닙니다',
        severity: 'high',
      },
    },
    {
      applies: reason === 'other',
      violation: {
        code: 'emotional_sell',
        message: '감정 매도 의심 — 사유를 다시 확인하세요',
        severity: 'high',
      },
    },
    {
      applies: recentSellCount30d >= OVERTRADING_SELL_COUNT && !PLANNED_SELL_REASONS.includes(reason),
      violation: {
        code: 'overtrading',
        message: `최근 30일 매도 ${recentSellCount30d}회 — 과다 거래`,
        severity: 'medium',
      },
    },
  ];
  return rules.filter((r) => r.applies).map((r) => r.violation);
}
