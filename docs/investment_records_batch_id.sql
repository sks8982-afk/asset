-- 같은 날 여러 번 저장한 기록을 차수별로 선택 삭제하려면 batch_id 컬럼이 필요합니다.
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE public.investment_records
ADD COLUMN IF NOT EXISTS batch_id UUID;

COMMENT ON COLUMN public.investment_records.batch_id IS '같은 날 여러 번 저장 시, 한 번의 저장(배치)을 구분하는 ID. NULL이면 배치 도입 전 기존 기록.';
