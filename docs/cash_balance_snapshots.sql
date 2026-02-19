-- 통장 잔고 스냅샷 (장부 기록 시 해당 날짜 기준 잔고 저장, CMA 이자·기록용)
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS public.cash_balance_snapshots (
  date DATE PRIMARY KEY,
  balance NUMERIC NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.cash_balance_snapshots IS '장부 기록 시점별 CMA 통장 잔고. 앱에서 장부 저장 시 upsert됨.';
