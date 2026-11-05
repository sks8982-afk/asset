import { describe, expect, it } from 'vitest';
import {
  addMonthsISO, annualizedReturn, applyPlanEdits, buildBuyRecords, buildSaveSummary, cleanPrice, cleanQty,
  corePercents, firstDepositDate, groupToBoost, isMarketDip, marketDips, planTotals, waitingCashOf,
} from './monthly';
import { coreDrift, planCoreBuys } from './core';
import type { MarketDataPoint } from './types';

const VEHICLES = (snp: number, kodex: number) => ({
  sp500: { key: 'snp', price: snp },
  nasdaq100: { key: 'nasdaq_kodex', price: kodex },
});

describe('waitingCashOf', () => {
  it('invests ledger cash plus CMA interest above the emergency fund', () => {
    expect(waitingCashOf({ ledgerCash: 400_000, accruedInterest: 1_200, emergencyFund: 300_000 })).toMatchObject({
      waiting: 101_200, blockedByEmergencyFund: false,
    });
  });

  it('flags cash hidden by an emergency fund that is too large', () => {
    expect(waitingCashOf({ ledgerCash: 120_000, accruedInterest: 0, emergencyFund: 300_000 })).toMatchObject({
      waiting: 0, blockedByEmergencyFund: true,
    });
    expect(waitingCashOf({ ledgerCash: 0, accruedInterest: 0, emergencyFund: 300_000 }).blockedByEmergencyFund).toBe(false);
  });

  it('never goes below zero and cleans bad inputs', () => {
    expect(waitingCashOf({ ledgerCash: -50_000, accruedInterest: -1, emergencyFund: -5 })).toMatchObject({
      waiting: 0, accruedInterest: 0, emergencyFund: 0, blockedByEmergencyFund: false,
    });
    expect(waitingCashOf({ ledgerCash: Number.NaN, accruedInterest: 10, emergencyFund: 0 }).waiting).toBe(10);
    expect(waitingCashOf({ ledgerCash: 18_445, accruedInterest: 0, emergencyFund: 0 }).waiting).toBe(18_445);
  });
});

describe('annualizedReturn (12-month gate)', () => {
  const budgets = [
    { month_date: '2025-11-05', amount: 1_000_000 },
    { month_date: '2026-05-05', amount: 1_000_000 },
    { month_date: '2026-06-05', amount: 0 },
  ];

  it('hides the rate until the first deposit is 12 months old', () => {
    expect(annualizedReturn({ budgets, totalAsset: 2_200_000, today: '2026-11-04' })).toEqual({ eligible: false, rate: null });
    const shown = annualizedReturn({ budgets, totalAsset: 2_200_000, today: '2026-11-05' });
    expect(shown.eligible).toBe(true);
    expect(shown.rate).toBeGreaterThan(0.1);
    expect(shown.rate).toBeLessThan(0.2);
  });

  it('matches a simple one-year deposit', () => {
    const r = annualizedReturn({ budgets: [{ month_date: '2025-01-01', amount: 100 }], totalAsset: 110, today: '2026-01-01' });
    expect(r.rate).toBeCloseTo(0.1, 2);
  });

  it('handles no deposits or a worthless account', () => {
    expect(annualizedReturn({ budgets: [], totalAsset: 1, today: '2026-11-05' })).toEqual({ eligible: false, rate: null });
    expect(annualizedReturn({ budgets, totalAsset: 0, today: '2027-01-01' })).toEqual({ eligible: true, rate: null });
  });

  it('finds the first non-empty deposit and adds months', () => {
    expect(firstDepositDate([{ month_date: '2024-01-01', amount: 0 }, { month_date: '2024-03-02T00:00:00', amount: 5 }]))
      .toBe('2024-03-02');
    expect(addMonthsISO('2025-11-05', 12)).toBe('2026-11-05');
    expect(addMonthsISO('2025-12-31', 2)).toBe('2026-02-31');
  });
});

describe('monthly plan rows', () => {
  const plan = planCoreBuys({ amount: 500_000, weights: { sp500: 0.7, nasdaq100: 0.3 }, vehicles: VEHICLES(25_500, 25_000) });

  it('buys 13 S&P500 + 6 Nasdaq100 shares from 500,000 KRW', () => {
    const rows = applyPlanEdits(plan, {});
    expect(rows.map((r) => [r.key, r.name, r.qty, r.price, r.amount])).toEqual([
      ['snp', 'TIGER 미국S&P500', 13, 25_500, 331_500],
      ['nasdaq_kodex', 'KODEX 미국나스닥100', 6, 25_000, 150_000],
    ]);
    expect(planTotals(rows, 500_000)).toEqual({ spent: 481_500, carryOver: 18_500 });
  });

  it('applies edited quantities and fill prices', () => {
    const rows = applyPlanEdits(plan, { snp: { price: 25_520 }, nasdaq_kodex: { qty: 5.7 } });
    expect(rows[0]).toMatchObject({ qty: 13, suggestedQty: 13, price: 25_520, amount: 331_760 });
    expect(rows[1]).toMatchObject({ qty: 5, suggestedQty: 6, amount: 125_000 });
    const over = applyPlanEdits(plan, { snp: { qty: 20 } });
    expect(planTotals(over, 500_000).carryOver).toBe(500_000 - 20 * 25_500 - 150_000);
  });

  it('cleans quantities and prices', () => {
    expect([cleanQty(-1), cleanQty(Number.NaN), cleanQty(3.9)]).toEqual([0, 0, 3]);
    expect([cleanPrice(-1), cleanPrice(Number.POSITIVE_INFINITY), cleanPrice(25_000.5)]).toEqual([0, 0, 25_000.5]);
  });

  it('builds buy records only for lines with shares', () => {
    const rows = applyPlanEdits(plan, { nasdaq_kodex: { qty: 0 } });
    expect(buildBuyRecords(rows, { date: '2026-11-05', batchId: 'b1', deposit: 500_000 })).toEqual([{
      date: '2026-11-05', asset_key: 'snp', price: 25_500, quantity: 13, amount: 331_500,
      is_panic_buy: false, batch_id: 'b1', batch_deposit: 500_000,
    }]);
  });

  it('summarizes the save for the confirm dialog', () => {
    const rows = applyPlanEdits(plan, {});
    const text = buildSaveSummary({ month: 11, deposit: 500_000, rows, budget: 500_000, addsToExistingMonth: false });
    expect(text).toContain('[11월 적립 기록]');
    expect(text).toContain('입금 500,000원');
    expect(text).toContain('TIGER 미국S&P500 13주 × 25,500원 = 331,500원');
    expect(text).toContain('매수 합계 481,500원 · 다음 달로 이월 18,500원');
    const extra = buildSaveSummary({ month: 11, deposit: 0, rows: [], budget: 0, addsToExistingMonth: true });
    expect(extra).toContain('[11월 추가 매수 기록]');
    expect(extra).toContain('입금 없음');
    expect(extra).toContain('매수 없음');
    const over = buildSaveSummary({
      month: 11, deposit: 100_000, rows: applyPlanEdits(plan, { snp: { qty: 20 } }), budget: 100_000, addsToExistingMonth: true,
    });
    expect(over).toContain('(이번 달 입금 기록에 더합니다)');
    expect(over).toContain('가용 금액보다');
  });
});

describe('marketDips', () => {
  const row = (d: string, snp: number, nasdaq: number): MarketDataPoint => ({ d, snp, nasdaq });
  // 끝난 달 13개 — 최근 12개(2025-11 ~ 2026-10)만 고점 후보
  const months = [
    row('2025-10', 30_000, 200_000), // 12개월 창 밖
    row('2025-11', 22_000, 100_000),
    row('2025-12', 25_000, 150_000),
    row('2026-01', 24_000, 140_000),
    row('2026-02', 24_000, 140_000),
    row('2026-03', 24_000, 140_000),
    row('2026-04', 24_000, 140_000),
    row('2026-05', 24_000, 140_000),
    row('2026-06', 24_000, 140_000),
    row('2026-07', 24_000, 140_000),
    row('2026-08', 24_000, 140_000),
    row('2026-09', 24_000, 140_000),
    row('2026-10', 24_000, 140_000),
    row('2026-11', 1, 1), // 진행 중인 달 — 제외
  ];

  it('measures the drop from the 12 completed months high to the live price', () => {
    const dips = marketDips(months, { snp: 22_500, nasdaq: 126_000 }, '2026-11');
    // 고점: 2025-11 ~ 2026-10 (2025-10 제외) → S&P500 25,000, 나스닥100 150,000
    expect(dips.sp500).toBeCloseTo(10);
    expect(dips.nasdaq100).toBeCloseTo(16);
    expect(isMarketDip(dips)).toBe(true);
  });

  it('stays quiet near the high or without prices', () => {
    const calm = marketDips(months, { snp: 24_500, nasdaq: 148_000 }, '2026-11');
    expect(isMarketDip(calm)).toBe(false);
    expect(marketDips(months, {}, '2026-11')).toEqual({ sp500: 0, nasdaq100: 0 });
  });
});

describe('core weight helpers', () => {
  it('suggests the underweight group only beyond 5%p', () => {
    const weights = { sp500: 0.7, nasdaq100: 0.3 };
    expect(groupToBoost(coreDrift({ snp: 640, nasdaq: 200, nasdaq_kodex: 160 }, weights))).toBe('sp500');
    expect(groupToBoost(coreDrift({ snp: 800, nasdaq_kodex: 200 }, weights))).toBe('nasdaq100');
    expect(groupToBoost(coreDrift({ snp: 680, nasdaq_kodex: 320 }, weights))).toBeNull();
    expect(groupToBoost(coreDrift({}, weights))).toBeNull();
  });

  it('formats percentages that add up to 100', () => {
    expect(corePercents({ sp500: 0.645, nasdaq100: 0.355 })).toEqual({ sp500: 65, nasdaq100: 35 });
    expect(corePercents({ sp500: 0.7, nasdaq100: 0.3 })).toEqual({ sp500: 70, nasdaq100: 30 });
    expect(corePercents({ sp500: 0, nasdaq100: 0 })).toEqual({ sp500: 0, nasdaq100: 0 });
  });
});
