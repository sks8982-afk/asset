/**
 * 날짜 헬퍼 — 실행 환경의 시간대와 무관하게 결과가 같도록 항상 timeZone을 명시한다.
 * (Vercel 서버는 UTC, 사용자 브라우저는 KST로 돈다.)
 */

/** 앱 기준 시간대 — 사용자는 한국에서 기록한다 */
export const APP_TZ = 'Asia/Seoul';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

type DateParts = { year: string; month: string; day: string };

/** 해당 시간대 기준 연·월·일 (잘못된 Date나 시간대면 RangeError) */
function datePartsIn(date: Date, timeZone: string): DateParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const pick = (type: 'year' | 'month' | 'day'): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return { year: pick('year'), month: pick('month'), day: pick('day') };
}

/** 오늘 날짜 'YYYY-MM-DD' (APP_TZ 기준) */
export function todayISO(now: Date = new Date()): string {
  const { year, month, day } = datePartsIn(now, APP_TZ);
  return `${year}-${month}-${day}`;
}

/** 이번 달 'YYYY-MM' (APP_TZ 기준) */
export function currentYearMonth(now: Date = new Date()): string {
  const { year, month } = datePartsIn(now, APP_TZ);
  return `${year}-${month}`;
}

/** 주어진 시간대에서 본 달 'YYYY-MM' — 거래소 시간대로 월봉 라벨을 매길 때 사용 */
export function monthLabel(date: Date, timeZone: string): string {
  const { year, month } = datePartsIn(date, timeZone);
  return `${year}-${month}`;
}

/** 개월 수 → 'N년 M개월' (0인 부분은 생략, 1개월 미만·음수는 '0개월') */
export function formatMonthsKo(totalMonths: number): string {
  const total = Number.isFinite(totalMonths) && totalMonths > 0 ? Math.floor(totalMonths) : 0;
  const years = Math.floor(total / 12);
  const months = total % 12;
  if (years === 0) return `${months}개월`;
  return months === 0 ? `${years}년` : `${years}년 ${months}개월`;
}

/** 'YYYY-MM' 또는 'YYYY-MM-DD' → 'YYYY년 M월' */
export function formatYearMonthKo(isoDate: string): string {
  return `${isoDate.slice(0, 4)}년 ${Number(isoDate.slice(5, 7))}월`;
}
