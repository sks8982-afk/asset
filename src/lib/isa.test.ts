import { describe, expect, it } from 'vitest';
import type { MonthlyBudget } from './types';
import {
  addMonthsClamped, depositsInYear, isaMaturityDate, isaMaturityStatus, resolveIsaOpenDate, wholeMonthsBetween,
} from './isa';

const budget = (monthDate: string, amount: number | string): MonthlyBudget =>
  ({ month_date: monthDate, amount: amount as number });

describe('addMonthsClamped', () => {
  it('moves by whole months and clamps to the end of a shorter month', () => {
    expect(addMonthsClamped('2026-11-05', 2)).toBe('2027-01-05');
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2024-02-29', 12)).toBe('2025-02-28');
    expect(addMonthsClamped('2024-02-29', 48)).toBe('2028-02-29');
    expect(addMonthsClamped('2026-03-31', -1)).toBe('2026-02-28');
  });
});

describe('wholeMonthsBetween', () => {
  it('counts only full months', () => {
    expect(wholeMonthsBetween('2026-11-05', '2027-03-15')).toBe(4);
    expect(wholeMonthsBetween('2026-11-05', '2027-03-04')).toBe(3);
    expect(wholeMonthsBetween('2026-11-05', '2027-03-05')).toBe(4);
    expect(wholeMonthsBetween('2026-11-05', '2029-11-05')).toBe(36);
    expect(wholeMonthsBetween('2026-11-05', '2026-11-30')).toBe(0);
  });

  it('treats a clamped month end as a full month', () => {
    expect(wholeMonthsBetween('2026-01-31', '2026-02-28')).toBe(1);
    expect(wholeMonthsBetween('2026-01-31', '2026-02-27')).toBe(0);
  });

  it('is 0 when the end is not after the start', () => {
    expect(wholeMonthsBetween('2026-11-05', '2026-11-05')).toBe(0);
    expect(wholeMonthsBetween('2026-11-05', '2025-01-01')).toBe(0);
  });
});

describe('isaMaturityDate', () => {
  it('is the opening date plus the 3-year mandatory period', () => {
    expect(isaMaturityDate('2023-03-15')).toBe('2026-03-15');
    expect(isaMaturityDate('2024-02-29')).toBe('2027-02-28');
  });
});

describe('isaMaturityStatus', () => {
  it('reports the months left before maturity', () => {
    expect(isaMaturityStatus('2024-03-15', '2026-11-05'))
      .toEqual({ maturity: '2027-03-15', passed: false, monthsLeft: 4 });
    expect(isaMaturityStatus('2025-01-06', '2026-11-05'))
      .toEqual({ maturity: '2028-01-06', passed: false, monthsLeft: 14 });
  });

  it('counts the maturity day itself as passed', () => {
    expect(isaMaturityStatus('2023-11-05', '2026-11-04')).toMatchObject({ passed: false, monthsLeft: 0 });
    expect(isaMaturityStatus('2023-11-05', '2026-11-05')).toEqual({ maturity: '2026-11-05', passed: true, monthsLeft: 0 });
    expect(isaMaturityStatus('2020-01-01', '2026-11-05')).toMatchObject({ passed: true, monthsLeft: 0 });
  });
});

describe('resolveIsaOpenDate', () => {
  const budgets = [budget('2025-02-03', 500_000), budget('2025-01-06T00:00:00', 300_000), budget('2024-12-01', 0)];

  it('uses the saved opening date', () => {
    expect(resolveIsaOpenDate('2024-03-15', budgets)).toEqual({ date: '2024-03-15', estimated: false });
  });

  it('falls back to the first deposit date as an estimate', () => {
    expect(resolveIsaOpenDate(null, budgets)).toEqual({ date: '2025-01-06', estimated: true });
  });

  it('is null without a saved date or deposits', () => {
    expect(resolveIsaOpenDate(null, [])).toBeNull();
    expect(resolveIsaOpenDate(null, [budget('2025-01-06', 0)])).toBeNull();
  });
});

describe('depositsInYear', () => {
  it('sums the deposits of one calendar year', () => {
    const budgets = [
      budget('2025-12-31', 900_000),
      budget('2026-01-05', 500_000),
      budget('2026-11-03', '600000'),
      budget('2027-01-02', 700_000),
      budget('2026-06-01', 'oops'),
    ];
    expect(depositsInYear(budgets, '2026')).toBe(1_100_000);
    expect(depositsInYear(budgets, '2024')).toBe(0);
  });
});
