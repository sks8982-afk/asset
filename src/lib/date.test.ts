import { afterEach, describe, expect, it } from 'vitest';
import { APP_TZ, currentYearMonth, monthLabel, todayISO } from './date';

describe('APP_TZ', () => {
  it('is Asia/Seoul', () => {
    expect(APP_TZ).toBe('Asia/Seoul');
  });
});

describe('todayISO / currentYearMonth', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it('uses the KST date, not the UTC date', () => {
    const lateUtc = new Date('2026-02-28T23:30:00Z'); // 2026-03-01 08:30 KST
    expect(todayISO(lateUtc)).toBe('2026-03-01');
    expect(currentYearMonth(lateUtc)).toBe('2026-03');
  });

  it('switches day exactly at 00:00 KST (15:00 UTC)', () => {
    expect(todayISO(new Date('2026-11-04T14:59:59Z'))).toBe('2026-11-04');
    expect(todayISO(new Date('2026-11-04T15:00:00Z'))).toBe('2026-11-05');
  });

  it('does not depend on the runtime time zone', () => {
    const at = new Date('2026-02-28T23:30:00Z');
    process.env.TZ = 'America/Los_Angeles';
    const inLa = todayISO(at);
    process.env.TZ = 'UTC';
    const inUtc = todayISO(at);
    expect(inLa).toBe('2026-03-01');
    expect(inUtc).toBe('2026-03-01');
  });

  it('defaults to the current time', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(currentYearMonth()).toMatch(/^\d{4}-\d{2}$/);
    expect(todayISO().slice(0, 7)).toBe(currentYearMonth());
  });
});

describe('monthLabel', () => {
  it('labels a KRX monthly bar (stamped at local midnight) with its own month', () => {
    expect(monthLabel(new Date('2026-01-31T15:00:00Z'), 'Asia/Seoul')).toBe('2026-02');
  });

  it('labels a UTC-stamped bar in UTC', () => {
    expect(monthLabel(new Date('2026-02-01T00:00:00Z'), 'UTC')).toBe('2026-02');
  });

  it('handles DST-shifted Europe/London stamps (KRW=X)', () => {
    expect(monthLabel(new Date('2026-08-31T23:00:00Z'), 'Europe/London')).toBe('2026-09');
    expect(monthLabel(new Date('2026-11-01T00:00:00Z'), 'Europe/London')).toBe('2026-11');
  });

  it('throws on an invalid date', () => {
    expect(() => monthLabel(new Date('not a date'), 'UTC')).toThrow(RangeError);
  });
});
