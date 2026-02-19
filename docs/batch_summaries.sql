-- 회차(배치)별로 '총 기록 금액', '매수 합계', '통장 잔고로 남은 금액'을 저장합니다.
-- 해당 회차 삭제 시 이 값을 기준으로 투자총액·통장 잔고를 정확히 되돌립니다.
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS public.batch_summaries (
  batch_id UUID PRIMARY KEY,
  date DATE NOT NULL,
  deposit NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  remaining_cash NUMERIC NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.batch_summaries IS '회차별: 총 기록(입금)액, 주식 매수 합계, 통장 잔고로 남은 금액. 삭제 시 deposit만큼 월 입금에서 차감.';
