/**
 * 벤치마크 비교 — "같은 달에 같은 금액을 S&P500만 / 70:30에 넣었다면?"
 */
import type { BenchmarkPoint, BenchmarkResult, MonthlyBudget } from './types';
import { currentYearMonth } from './date';
import { positiveDeposits } from './monthly';

/** 벤치마크 정의 — weights: 시세 키 → 비중 (합 1) */
export type BenchmarkDef = {
  key: string;
  label: string;
  weights: Readonly<Record<string, number>>;
  color: string;
};

/**
 * 벤치마크: S&P500만 / S&P500 70 + 나스닥100 30.
 * 나스닥100은 상장 이력이 가장 긴 TIGER 미국나스닥100(133690, 'nasdaq') 시세를 쓴다.
 */
export const BENCHMARKS: readonly BenchmarkDef[] = [
  { key: 'bm_snp', label: 'S&P500만', weights: { snp: 1 }, color: '#3b82f6' },
  { key: 'bm_7030', label: 'S&P500 70 / 나스닥100 30', weights: { snp: 0.7, nasdaq: 0.3 }, color: '#8b5cf6' },
];

type PriceMap = Readonly<Record<string, number>>;

/** 0 초과 유한 가격만 남긴 맵 */
function validPrices(source: Readonly<Record<string, unknown>>, keys: readonly string[]): Record<string, number> {
  return Object.fromEntries(
    keys
      .map((k) => [k, Number(source[k])] as const)
      .filter(([, p]) => Number.isFinite(p) && p > 0),
  );
}

/**
 * 벤치마크 가상 계좌 — 입금액을 비중대로 나눠 산다.
 * 그 시점 가격이 없는 종목 몫은 현금으로 들고 있다가(액면 평가) 가격이 생기는 첫 달에 산다.
 */
function createBenchmarkBook(weights: PriceMap) {
  const keys = Object.keys(weights);
  const units = new Map<string, number>();
  const pending = new Map<string, number>();
  return {
    deposit(amount: number): void {
      for (const k of keys) pending.set(k, (pending.get(k) ?? 0) + amount * weights[k]);
    },
    /** 이번 시점 가격으로 대기 현금 매수 (가격 없는 종목은 계속 대기) */
    settle(prices: PriceMap): void {
      for (const k of keys) {
        const cash = pending.get(k) ?? 0;
        const p = prices[k] ?? 0;
        if (cash > 0 && p > 0) {
          units.set(k, (units.get(k) ?? 0) + cash / p);
          pending.set(k, 0);
        }
      }
    },
    /** 평가액 = 보유수량 × 마지막 유효 가격 + 대기 현금 */
    value(markPrices: PriceMap): number {
      return keys.reduce(
        (sum, k) => sum + (units.get(k) ?? 0) * (markPrices[k] ?? 0) + (pending.get(k) ?? 0),
        0,
      );
    },
  };
}

/** 입금 행 → 달('YYYY-MM')별 입금 합계 (입금일은 KST 날짜로 저장된다, 금액이 있는 행만) */
function monthlyDeposits(budgets: readonly Pick<MonthlyBudget, 'month_date' | 'amount'>[]): Map<string, number> {
  const deposits = new Map<string, number>();
  for (const { date, amount } of positiveDeposits(budgets)) {
    const month = date.slice(0, 7);
    deposits.set(month, (deposits.get(month) ?? 0) + amount);
  }
  return deposits;
}

/** 내 포트폴리오 + 벤치마크 최종 성과 (수익률 높은 순) */
function summarizeBenchmarks(lastPoint: BenchmarkPoint | undefined): BenchmarkResult[] {
  const totalPrincipal = Number(lastPoint?.principal ?? 0);
  const totalReturnOf = (v: number): number =>
    totalPrincipal > 0 ? (v / totalPrincipal - 1) * 100 : 0;
  const myValue = Number(lastPoint?.myPortfolio ?? 0);
  const results: BenchmarkResult[] = [
    { key: 'myPortfolio', label: '내 포트폴리오', finalValue: myValue, totalReturn: totalReturnOf(myValue), color: '#0f172a' },
    ...BENCHMARKS.map((bm) => {
      const v = Number(lastPoint?.[bm.key] ?? 0);
      return { key: bm.key, label: bm.label, finalValue: v, totalReturn: totalReturnOf(v), color: bm.color };
    }),
  ];
  return results.sort((a, b) => b.totalReturn - a.totalReturn);
}

/**
 * 벤치마크 대비 수익률 비교 계산
 *
 * 핵심: "같은 달에 같은 금액을 [벤치마크]에 넣었다면?"
 * - 입금 시점·금액: 입금 행(monthly_budgets)을 달별로 묶은 합계
 * - 매수 시세: 해당 월 시세. 시세가 없는 달의 입금은 다음 시세 달에, 마지막 시세 달 뒤의 입금
 *   (그달 첫 거래일 전에 넣은 입금 포함)은 실시간 시세로 산다
 * - 벤치마크 종목 가격이 없는 달의 입금은 현금으로 대기 → 첫 유효 가격 달에 매수
 *
 * @param budgets - 입금 행 [{month_date, amount}]
 * @param chartHistory - 내 포트폴리오 월별 가치 [{date, investment}]
 * @param marketHistory - 전체 월별 시세 [{d, snp, nasdaq, ...}]
 * @param livePrices - 실시간 시세
 * @param now - 기준 시각 (이번 달은 KST로 판정)
 */
export function calculateBenchmarkComparison(
  budgets: readonly Pick<MonthlyBudget, 'month_date' | 'amount'>[],
  chartHistory: readonly { date: string; investment: number }[],
  marketHistory: Record<string, unknown>[],
  livePrices: Record<string, number>,
  now: Date = new Date(),
): { points: BenchmarkPoint[]; results: BenchmarkResult[] } {
  if (chartHistory.length === 0 || marketHistory.length === 0) {
    return { points: [], results: [] };
  }

  const priceKeys = Array.from(new Set(BENCHMARKS.flatMap((bm) => Object.keys(bm.weights))));
  const priceByMonth = new Map(
    marketHistory
      .map((row) => [String(row.d ?? ''), validPrices(row, priceKeys)] as const)
      .filter(([d]) => d.length > 0),
  );
  const sortedChart = [...chartHistory].sort((a, b) => a.date.localeCompare(b.date));
  const depositByMonth = monthlyDeposits(budgets);
  const depositMonths = Array.from(depositByMonth.keys()).sort();
  const myDataByMonth = new Map(chartHistory.map((ch) => [ch.date, ch]));

  // 차트 범위: chartHistory 시작점(또는 첫 입금 월 중 빠른 쪽)부터
  const allMonths = Array.from(priceByMonth.keys()).filter((d) => d.length >= 7).sort();
  const firstDepositMonth = depositMonths[0];
  if (!firstDepositMonth || allMonths.length === 0) {
    return { points: [], results: [] };
  }
  const chartStartMonth = sortedChart[0].date.substring(0, 7);
  const startMonth = chartStartMonth < firstDepositMonth ? chartStartMonth : firstDepositMonth;
  const relevantMonths = allMonths.filter((m) => m.substring(0, 7) >= startMonth);

  const books = BENCHMARKS.map((bm) => createBenchmarkBook(bm.weights));
  let markPrices: Record<string, number> = {}; // 종목별 마지막 유효 가격 (평가용)
  let cumulativeDeposit = 0;
  const bookValues = (): Record<string, number> =>
    Object.fromEntries(BENCHMARKS.map((bm, i) => [bm.key, books[i].value(markPrices)]));

  /** 아직 사지 않은 입금 중 month 이하인 달의 합계 (시세가 없던 달의 입금은 다음 시세 달로 넘어온다) */
  let nextDepositIndex = 0;
  const takeDepositsUntil = (month: string): number => {
    let sum = 0;
    while (nextDepositIndex < depositMonths.length && depositMonths[nextDepositIndex] <= month) {
      sum += depositByMonth.get(depositMonths[nextDepositIndex]) ?? 0;
      nextDepositIndex += 1;
    }
    return sum;
  };

  const points: BenchmarkPoint[] = [];
  for (const ym of relevantMonths) {
    const deposit = takeDepositsUntil(ym.substring(0, 7));
    cumulativeDeposit += deposit;
    const monthPrices = priceByMonth.get(ym) ?? {};
    markPrices = { ...markPrices, ...monthPrices };
    for (const book of books) {
      if (deposit > 0) book.deposit(deposit);
      book.settle(monthPrices);
    }
    const myData = myDataByMonth.get(ym);
    points.push({
      date: ym,
      myPortfolio: myData?.investment ?? (cumulativeDeposit > 0 ? cumulativeDeposit : 0),
      principal: cumulativeDeposit,
      ...bookValues(),
    });
  }

  // ── 마지막 시세 달 뒤의 입금 (그달 첫 거래일 전 입금 포함) — 실시간 시세로 매수, 없으면 대기 현금 ──
  const live = validPrices(livePrices ?? {}, priceKeys);
  const laterDeposit = takeDepositsUntil('9999-12');
  if (laterDeposit > 0) {
    cumulativeDeposit += laterDeposit;
    for (const book of books) {
      book.deposit(laterDeposit);
      book.settle(live);
    }
  }

  // ── 마지막 포인트: 실시간 시세 기준 "오늘" ──
  if (livePrices) {
    markPrices = { ...markPrices, ...live };
    for (const book of books) book.settle(live);
    const currentYM = currentYearMonth(now);
    const lastChart = sortedChart[sortedChart.length - 1];
    const todayPoint: BenchmarkPoint = {
      date: currentYM,
      myPortfolio: lastChart?.investment ?? cumulativeDeposit,
      principal: cumulativeDeposit,
      ...bookValues(),
    };
    if (points.length > 0 && points[points.length - 1].date === currentYM) {
      points[points.length - 1] = todayPoint;
    } else {
      points.push(todayPoint);
    }
  }

  return { points, results: summarizeBenchmarks(points[points.length - 1]) };
}
