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

// ─── 매수 시그널 시스템 ───

/** 시그널 레벨 (5단계) */
export type SignalLevel = 'normal' | 'watch' | 'opportunity' | 'strong_buy' | 'all_in';

/** 개별 자산 시그널 */
export type AssetSignal = {
  key: string;
  score: number; // 0-100
  level: SignalLevel;
  multiplier: number;
  drawdownFromPeak: number; // 고점 대비 낙폭 %
  drawdownScore: number;
  maBelowPct6: number; // 6개월 MA 대비 괴리율 %
  maBelowPct12: number; // 12개월 MA 대비 괴리율 %
  maScore: number;
  consecutiveDeclines: number; // 연속 하락 개월수
  momentumScore: number;
  reasons: string[];
};

/** 전체 시장 시그널 */
export type MarketSignal = {
  overallScore: number; // 0-100
  overallLevel: SignalLevel;
  overallMultiplier: number;
  assetSignals: Record<string, AssetSignal>;
  correlationScore: number; // 동시 하락 자산수 기반
  signalCount: number; // opportunity 이상인 자산 수
  reasons: string[];
};

/** 세금 시뮬레이션 결과 */
export type TaxSimulation = {
  // ─── ISA 계좌 내 (손익통산 적용) ───
  /** ISA 내 매매 순이익 (이익 - 손실) */
  isaNetGain: number;
  /** ISA 내 배당 수익 */
  isaDividend: number;
  /** ISA 내 총 순이익 (매매 + 배당) */
  isaTotalProfit: number;
  /** ISA 비과세 한도 */
  isaTaxFreeLimit: number;
  /** ISA 비과세 적용액 */
  isaTaxFreeAmount: number;
  /** ISA 분리과세 대상액 (초과분) */
  isaTaxableAmount: number;
  /** ISA 분리과세 (9.9%) */
  isaTax: number;
  /** ISA 비과세 잔여 한도 */
  isaTaxFreeRemaining: number;

  // ─── ISA 밖 (BTC 등) ───
  /** BTC 양도차익 */
  btcGain: number;
  /** BTC 과세표준 (250만원 공제 후) */
  btcTaxBase: number;
  /** BTC 세금 (22%) */
  btcTax: number;

  // ─── 합산 ───
  /** 총 예상 세금 */
  totalEstimatedTax: number;
  /** ISA 절세 효과 (일반과세 대비 절약액) */
  isaSavings: number;
};
