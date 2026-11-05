import { describe, expect, it } from 'vitest';
import { buildBuyPlan } from './useBuyPlan';

const myAccount = {
  currentPriceMap: { snp: 25_000, nasdaq_kodex: 20_000, btc: 100_000_000 },
  prevPriceMap: { snp: 20_000, nasdaq_kodex: 20_000, btc: 0 },
};

describe('buildBuyPlan', () => {
  it('splits the budget by ratio into whole shares', () => {
    const plan = buildBuyPlan({
      myAccount, inputBudget: 500_000, ratios: { snp: 7, nasdaq_kodex: 3, cash: 0 }, manualEdits: {},
    });
    expect(plan?.guide.snp).toEqual({ qty: 14, baseQty: 14, price: 25_000, spent: 350_000, drop: 25 });
    expect(plan?.guide.nasdaq_kodex).toMatchObject({ qty: 7, spent: 140_000, drop: 0 });
    expect(plan?.guide.cash).toBeUndefined();
    expect(plan?.totalExpectedSpend).toBe(490_000);
    expect(plan?.thisMonthResidue).toBe(10_000);
  });

  it('buys fractional BTC and keeps manual quantities', () => {
    const plan = buildBuyPlan({
      myAccount, inputBudget: 1_000_000, ratios: { snp: 1, btc: 1 }, manualEdits: { snp: 2, btc: -1 },
    });
    expect(plan?.guide.snp).toMatchObject({ qty: 2, baseQty: 20, spent: 50_000 });
    expect(plan?.guide.btc).toMatchObject({ qty: 0, baseQty: 0.005 });
    expect(plan?.thisMonthResidue).toBe(950_000);
  });

  it('skips assets without a price and empty ratios', () => {
    const noPrice = buildBuyPlan({ myAccount, inputBudget: 100_000, ratios: { gold: 1 }, manualEdits: {} });
    expect(noPrice?.guide.gold).toEqual({ qty: 0, baseQty: 0, price: 0, spent: 0, drop: -100 });
    const zero = buildBuyPlan({ myAccount, inputBudget: 100_000, ratios: { snp: 0 }, manualEdits: {} });
    expect(zero?.guide.snp.qty).toBe(0);
    expect(buildBuyPlan({ myAccount: null, inputBudget: 1, ratios: {}, manualEdits: {} })).toBeNull();
  });
});
