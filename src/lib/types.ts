/** 투자 기록 (매수/매도) */
export type InvestmentRecord = {
  id?: string;
  date: string;
  asset_key: string;
  price: number | string;
  quantity: number | string;
  amount: number | string;
  amount_override?: number | null;
  is_panic_buy?: boolean;
  batch_id?: string | null;
  batch_deposit?: number | null;
  /** 'buy' | 'sell' — 기본값 'buy' (하위호환) */
  type?: 'buy' | 'sell';
};

/** 월별 입금 */
export type MonthlyBudget = {
  id?: string;
  month_date: string;
  amount: number;
};

/** 배치 요약 */
export type BatchSummary = {
  batch_id: string;
  date: string;
  deposit: number;
  total_spent: number;
  remaining_cash: number;
};

/** CMA 잔고 스냅샷 */
export type CashSnapshot = {
  date: string;
  balance: number;
};

/** 배당금 기록 */
export type DividendRecord = {
  id?: string;
  date: string;
  asset_key: string;
  amount: number;
  is_reinvested: boolean;
  note?: string;
};

/** 자산별 포트폴리오 상태 */
export type AssetPortfolio = {
  qty: number;
  cost: number;
  avg: number;
  val: number;
  roi: number;
  weight: number;
  /** 실현 손익 (매도 기록 기반) */
  realizedPnl: number;
};

/** 마켓 그룹 (국내/해외/기타) */
export type AssetMarketGroup = {
  label: string;
  keys: string[];
};

/** 비중 프리셋 */
export type RatioPreset = {
  name: string;
  ratios: Record<string, number>;
};

/** DB에서 로드하는 전체 히스토리 */
export type DbHistory = {
  budgets: MonthlyBudget[];
  records: InvestmentRecord[];
  batchSummaries: BatchSummary[];
  snapshots: CashSnapshot[];
  dividends: DividendRecord[];
};

/** 포트폴리오 분석 결과 */
export type MyAccountData = {
  currentCashBalance: number;
  portfolio: Record<string, AssetPortfolio>;
  currentPriceMap: Record<string, number>;
  prevPriceMap: Record<string, number>;
  totalStockValue: number;
  totalAsset: number;
  totalInvested: number;
  isCrash: boolean;
  chartHistory: ChartDataPoint[];
  currentExchangeRate: number;
  cumulativeCmaInterestToToday: number;
  /** 총 실현 손익 */
  totalRealizedPnl: number;
  /** 총 배당 수익 */
  totalDividends: number;
};

/** 차트 데이터 포인트 */
export type ChartDataPoint = {
  date: string;
  principal: number;
  investment: number;
  cash: number;
  cmaInterest: number;
  /** 월별 ROI % */
  roiPct?: number;
  [key: string]: string | number | undefined;
};

/** 매수 가이드 아이템 */
export type BuyGuideItem = {
  qty: number;
  baseQty: number;
  extraQty: number;
  price: number;
  spent: number;
  drop: number;
};

/** 매수 플랜 결과 */
export type BuyPlanResult = {
  guide: Record<string, BuyGuideItem>;
  thisMonthResidue: number;
  totalExpectedSpend: number;
  cmaMonthlyInterest: number;
  cmaBalanceForInterest: number;
};

/** 리밸런싱 아이템 */
export type RebalancingItem = {
  key: string;
  name: string;
  targetWeight: number;
  currentWeight: number;
  targetAmount: number;
  currentAmount: number;
  diff: number;
};

/** 세금 시뮬레이션 결과 */
export type TaxSimulation = {
  /** 해외주식 양도차익 (원) */
  foreignGain: number;
  /** 공제액 (250만원) */
  foreignExemption: number;
  /** 과세표준 */
  foreignTaxBase: number;
  /** 예상 세금 (22%) */
  foreignTax: number;
  /** 국내주식 양도차익 */
  domesticGain: number;
  /** 배당소득세 */
  dividendTax: number;
  /** 총 예상 세금 */
  totalEstimatedTax: number;
};
