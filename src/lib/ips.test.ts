import { describe, expect, it } from 'vitest';
import {
  checkSellAgainstPolicy, DEFAULT_POLICY_RULES, SELL_REASON_LABELS, type SellReason,
} from './ips';

const codes = (input: Parameters<typeof checkSellAgainstPolicy>[0]) =>
  checkSellAgainstPolicy(input).map((v) => v.code);

describe('checkSellAgainstPolicy', () => {
  it('flags selling a losing core asset for any reason but rebalancing', () => {
    const reasons: SellReason[] = ['simplify', 'goal_reached', 'emergency_cash'];
    for (const reason of reasons) {
      const violations = checkSellAgainstPolicy({ assetKey: 'snp', assetRoi: -12, reason, recentSellCount30d: 0 });
      expect(violations).toEqual([{
        code: 'core_loss_sell',
        message: '손실 중인 코어 자산 매도 — 하락은 매도 이유가 아닙니다',
        severity: 'high',
      }]);
    }
    expect(codes({ assetKey: 'nasdaq_kodex', assetRoi: -0.1, reason: 'goal_reached', recentSellCount30d: 0 }))
      .toEqual(['core_loss_sell']);
    expect(codes({ assetKey: 'snp', assetRoi: -30, reason: 'rebalancing', recentSellCount30d: 0 })).toEqual([]);
  });

  it('allows selling a core asset in profit', () => {
    expect(codes({ assetKey: 'nasdaq', assetRoi: 25, reason: 'goal_reached', recentSellCount30d: 0 })).toEqual([]);
    expect(codes({ assetKey: 'snp', assetRoi: 0, reason: 'emergency_cash', recentSellCount30d: 1 })).toEqual([]);
  });

  it('never flags consolidating a hold asset', () => {
    expect(codes({ assetKey: 'tech10', assetRoi: -40, reason: 'simplify', recentSellCount30d: 0 })).toEqual([]);
    expect(codes({ assetKey: 'samsung', assetRoi: -10, reason: 'simplify', recentSellCount30d: 5 })).toEqual([]);
  });

  it('flags the "other" reason as a possible emotional sell', () => {
    const violations = checkSellAgainstPolicy({ assetKey: 'gold', assetRoi: 10, reason: 'other', recentSellCount30d: 0 });
    expect(violations).toEqual([{
      code: 'emotional_sell',
      message: '감정 매도 의심 — 사유를 다시 확인하세요',
      severity: 'high',
    }]);
  });

  it('flags frequent selling unless the sells are planned', () => {
    const violations = checkSellAgainstPolicy({ assetKey: 'btc', assetRoi: 50, reason: 'goal_reached', recentSellCount30d: 2 });
    expect(violations).toEqual([{ code: 'overtrading', message: '최근 30일 매도 2회 — 과다 거래', severity: 'medium' }]);
    expect(codes({ assetKey: 'btc', assetRoi: 50, reason: 'goal_reached', recentSellCount30d: 1 })).toEqual([]);
    expect(codes({ assetKey: 'snp', assetRoi: 5, reason: 'rebalancing', recentSellCount30d: 3 })).toEqual([]);
  });

  it('reports every violated rule in order', () => {
    expect(codes({ assetKey: 'snp', assetRoi: -5, reason: 'other', recentSellCount30d: 4 }))
      .toEqual(['core_loss_sell', 'emotional_sell', 'overtrading']);
  });

  it('treats unknown assets as non-core', () => {
    expect(codes({ assetKey: 'unknown', assetRoi: -50, reason: 'emergency_cash', recentSellCount30d: 0 })).toEqual([]);
  });
});

describe('policy texts', () => {
  it('has the three default rules', () => {
    expect(DEFAULT_POLICY_RULES).toEqual([
      '매달 정한 금액을 S&P500 70 : 나스닥100 30으로 산다. 시장 상황과 뉴스는 보지 않는다.',
      '하락은 매도 이유가 아니다. 리밸런싱이나 목적 변경이 아니면 팔지 않는다.',
      '비중은 새로 넣는 돈으로 맞춘다. 새 테마·개별 종목은 사지 않고, 비상금은 투자하지 않는다.',
    ]);
  });

  it('labels every sell reason', () => {
    expect(Object.keys(SELL_REASON_LABELS).sort()).toEqual(
      ['emergency_cash', 'goal_reached', 'other', 'rebalancing', 'simplify'],
    );
  });
});
