-- 비트코인 등 다른 거래소 매수액 직접 수정용 (금액 오버라이드)
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE public.investment_records
ADD COLUMN IF NOT EXISTS amount_override numeric NULL;

COMMENT ON COLUMN public.investment_records.amount_override IS '매수 금액 수동 입력값(원). 설정 시 amount 대신 이 값으로 잔여현금·원금 합계 등에 반영. 비트코인 등 타 거래소 금액 보정용.';
