import { describe, expect, it } from 'vitest';
import type { DividendRecord, InvestmentRecord } from './types';
import { calculateIsaProjection, calculateTaxSimulation } from './tax';

const buy = (
  date: string, assetKey: string, price: number, quantity: number, extra: Partial<InvestmentRecord> = {},
): InvestmentRecord => ({ date, asset_key: assetKey, price, quantity, amount: price * quantity, type: 'buy', ...extra });

const sell = (date: string, assetKey: string, price: number, quantity: number): InvestmentRecord => ({
  date, asset_key: assetKey, price, quantity, amount: price * quantity, type: 'sell',
});

const div = (date: string, assetKey: string, amount: number): DividendRecord => ({
  date, asset_key: assetKey, amount, is_reinvested: false,
});

describe('calculateTaxSimulation (ISA cumulative)', () => {
  const records = [
    buy('2025-01-10', 'snp', 20_000, 100),
    sell('2025-12-10', 'snp', 80_000, 50), // +3,000,000 (2025)
    buy('2025-02-10', 'nasdaq', 30_000, 100),
    sell('2026-03-10', 'nasdaq', 20_000, 100), // -1,000,000 (2026)
    buy('2025-03-10', 'gold', 50_000, 10),
    sell('2026-04-10', 'gold', 120_000, 10), // +700,000 (2026)
    buy('2025-01-10', 'samsung', 50_000, 100),
    sell('2026-05-10', 'samsung', 100_000, 100), // +5,000,000 국내주식 → 제외
  ];
  const dividends = [
    div('2025-04-15', 'snp', 1_500_000),
    div('2026-04-15', 'samsung', 500_000),
    div('2026-04-15', 'btc', 100_000), // ISA 밖 → 제외
    div('2026-04-15', 'unknown', 100), // 미등록 자산 → 제외
  ];

  it('nets foreign/gold ETF P&L over all years and adds distributions', () => {
    const tax = calculateTaxSimulation(records, dividends);
    expect(tax.isaNetGain).toBe(2_700_000);
    expect(tax.isaDividend).toBe(2_000_000);
    expect(tax.isaTotalProfit).toBe(4_700_000);
    expect(tax.isaTaxFreeLimit).toBe(4_000_000);
    expect(tax.isaTaxFreeAmount).toBe(4_000_000);
    expect(tax.isaTaxableAmount).toBe(700_000);
    expect(tax.isaTax).toBe(69_300);
    expect(tax.isaTaxFreeRemaining).toBe(0);
    // 일반계좌: 이익만 15.4% (3,000,000 + 700,000 + 배당 2,000,000)
    expect(tax.isaSavings).toBe(877_800 - 69_300);
    expect(tax.btcGain).toBe(0);
    expect(tax.totalEstimatedTax).toBe(69_300);
  });

  it('can still look at a single year', () => {
    const y2025 = calculateTaxSimulation(records, dividends, 2025);
    expect(y2025.isaNetGain).toBe(3_000_000);
    expect(y2025.isaDividend).toBe(1_500_000);
    expect(y2025.isaTax).toBe(49_500);

    const y2026 = calculateTaxSimulation(records, dividends, 2026);
    expect(y2026.isaNetGain).toBe(-300_000);
    expect(y2026.isaTotalProfit).toBe(200_000);
    expect(y2026.isaTax).toBe(0);
    expect(y2026.isaTaxFreeRemaining).toBe(3_800_000);
  });

  it('does not offset domestic equity losses', () => {
    const tax = calculateTaxSimulation([
      buy('2025-01-10', 'snp', 10_000, 100), sell('2025-06-10', 'snp', 20_000, 100), // +1,000,000
      buy('2025-01-10', 'kodex200', 40_000, 100), sell('2025-06-10', 'kodex200', 20_000, 100), // -2,000,000
    ], []);
    expect(tax.isaNetGain).toBe(1_000_000);
    expect(tax.isaTotalProfit).toBe(1_000_000);
  });

  it('lets ETF losses offset distributions', () => {
    const tax = calculateTaxSimulation(
      [buy('2025-01-10', 'nasdaq', 30_000, 100), sell('2025-06-10', 'nasdaq', 20_000, 100)],
      [div('2025-07-01', 'snp', 300_000)],
    );
    expect(tax.isaNetGain).toBe(-1_000_000);
    expect(tax.isaTotalProfit).toBe(0);
    expect(tax.isaTax).toBe(0);
    expect(tax.isaTaxFreeRemaining).toBe(4_000_000);
  });

  it('uses the 일반형 limit', () => {
    const tax = calculateTaxSimulation(records, dividends, undefined, 'general');
    expect(tax.isaTaxFreeLimit).toBe(2_000_000);
    expect(tax.isaTaxableAmount).toBe(2_700_000);
    expect(tax.isaTax).toBe(267_300);
  });

  it('taxes crypto per year from 2027 with the 2.5M deduction', () => {
    const btc = [
      buy('2025-01-01', 'btc', 100_000_000, 0.1),
      sell('2026-06-01', 'btc', 200_000_000, 0.03), // +3,000,000 (2026, 비과세)
      sell('2027-06-01', 'btc', 200_000_000, 0.04), // +4,000,000 (2027, 과세표준 1,500,000)
      sell('2028-06-01', 'btc', 50_000_000, 0.03), // -1,500,000 (2028)
    ];
    const all = calculateTaxSimulation(btc, []);
    expect(all.btcGain).toBeCloseTo(7_000_000);
    expect(all.btcTaxBase).toBeCloseTo(1_500_000);
    expect(all.btcTax).toBe(330_000);
    expect(all.totalEstimatedTax).toBe(330_000);

    expect(calculateTaxSimulation(btc, [], 2026).btcTax).toBe(0);
    const y2027 = calculateTaxSimulation(btc, [], 2027);
    expect(y2027.btcGain).toBeCloseTo(4_000_000);
    expect(y2027.btcTax).toBe(330_000);
    expect(calculateTaxSimulation(btc, [], 2028).btcGain).toBe(0);
  });
});

describe('calculateIsaProjection', () => {
  it('values the ISA projection at the moving average', () => {
    const records = [
      buy('2025-01-10', 'snp', 100, 10),
      sell('2025-02-10', 'snp', 150, 10), // 실현 +500, 전량 매도
      buy('2025-03-10', 'snp', 200, 10), // 새 평균 200
    ];
    const p = calculateIsaProjection(records, [], { snp: 260 });
    expect(p.realizedTaxable).toBe(500);
    expect(p.unrealizedTaxable).toBe(600);
  });

  const records = [
    buy('2025-01-10', 'snp', 20_000, 10),
    buy('2025-06-10', 'snp', 30_000, 10), // 평단 25,000
    sell('2026-01-10', 'snp', 35_000, 5), // 실현 +50,000, 보유 15주
    buy('2025-01-10', 'samsung', 50_000, 10), // 국내주식 → 제외
    buy('2025-01-10', 'nasdaq_kodex', 25_000, 10), // 현재가 없음 → 제외
    buy('2025-01-10', 'gold', 100_000, 10), // 평가손 -100,000
  ];
  const dividends = [div('2025-12-20', 'snp', 10_000)];
  const live = { snp: 40_000, samsung: 100_000, nasdaq_kodex: 0, gold: 90_000 };

  it('adds unrealized ETF gains to realized gains and distributions', () => {
    const p = calculateIsaProjection(records, dividends, live);
    expect(p.realizedTaxable).toBe(60_000);
    expect(p.unrealizedTaxable).toBe(225_000 - 100_000);
    expect(p.totalTaxable).toBe(185_000);
    expect(p.taxFreeLimit).toBe(4_000_000);
    expect(p.taxFreeRemaining).toBe(3_815_000);
    expect(p.estimatedTaxIfRealizedNow).toBe(0);
  });

  it('is consistent with realized P&L (average cost)', () => {
    const p = calculateIsaProjection(records.slice(0, 3), [], { snp: 40_000 });
    // 실현 + 미실현 = 매도대금 + 보유평가 − 총매수
    expect(p.realizedTaxable + p.unrealizedTaxable).toBe(175_000 + 40_000 * 15 - 500_000);
  });

  it('estimates tax above the limit', () => {
    const big = [buy('2025-01-10', 'snp', 20_000, 100)];
    const common = calculateIsaProjection(big, [], { snp: 70_000 });
    expect(common.unrealizedTaxable).toBe(5_000_000);
    expect(common.taxFreeRemaining).toBe(0);
    expect(common.estimatedTaxIfRealizedNow).toBe(99_000);
    expect(calculateIsaProjection(big, [], { snp: 70_000 }, 'general').estimatedTaxIfRealizedNow).toBe(297_000);
  });

  it('lets unrealized losses offset realized gains', () => {
    const p = calculateIsaProjection([
      buy('2025-01-10', 'snp', 10_000, 100), sell('2025-06-10', 'snp', 20_000, 100), // 실현 +1,000,000, 전량 매도
      buy('2025-01-10', 'nasdaq', 30_000, 100), // 평가손 -1,500,000
    ], [], { snp: 99_999, nasdaq: 15_000 });
    expect(p.realizedTaxable).toBe(1_000_000);
    expect(p.unrealizedTaxable).toBe(-1_500_000);
    expect(p.totalTaxable).toBe(0);
    expect(p.taxFreeRemaining).toBe(4_000_000);
  });
});
