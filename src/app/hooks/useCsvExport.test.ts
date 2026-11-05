import { describe, expect, it } from 'vitest';
import { buildLedgerCsv } from './useCsvExport';

describe('buildLedgerCsv', () => {
  const dbHistory = {
    records: [
      { date: '2026-11-05', asset_key: 'snp', price: 25_000, quantity: 2, amount: 50_000, type: 'buy' as const },
      { date: '2026-11-06', asset_key: 'tech10', price: 30_000, quantity: 1, amount: 30_000, type: 'sell' as const },
      { date: '2025-03-10', asset_key: 'gold', price: 100, quantity: 1, amount: 100, amount_override: 120, is_panic_buy: true },
    ],
    budgets: [{ month_date: '2026-11-05', amount: 500_000 }],
  };

  it('labels buys and sells and uses the given KST date', () => {
    const lines = buildLedgerCsv(dbHistory, { totalAsset: 1_500_000, totalInvested: 1_000_000 }, '2026-11-06').split('\n');
    expect(lines[0]).toBe('구분,날짜,항목,단가,수량,금액,비고');
    expect(lines[1]).toBe('매수,2026-11-05,TIGER 미국S&P500,25000,2,50000,');
    expect(lines[2]).toBe('매도,2026-11-06,TIGER 미국테크TOP10 INDXX,30000,1,30000,');
    expect(lines[3]).toBe('매수,2025-03-10,TIGER KRX금현물,100,1,120,추매');
    expect(lines).toContain('2026-11-05,500000');
    expect(lines).toContain('기준일,2026-11-06');
    expect(lines).toContain('총자산,1500000');
    expect(lines).toContain('수익률(%),50');
  });

  it('omits the snapshot totals without account data', () => {
    const csv = buildLedgerCsv({ records: [], budgets: [] }, null, '2026-11-06');
    expect(csv.endsWith('기준일,2026-11-06')).toBe(true);
  });
});
