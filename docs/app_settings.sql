-- 앱 설정 (비상금 등, 단일 행)
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  emergency_fund_amount numeric NOT NULL DEFAULT 300000,
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.app_settings IS '앱 전역 설정. 비상금(고정 금액, 원) 등. id=1 한 행만 사용.';
COMMENT ON COLUMN public.app_settings.emergency_fund_amount IS '비상금 고정 금액(원). 통장에서 이 금액은 일상 현금으로 유지, 나머지를 투자 가능으로 표시.';

-- 초기 행 삽입 (이미 있으면 무시)
INSERT INTO public.app_settings (id, emergency_fund_amount)
VALUES (1, 300000)
ON CONFLICT (id) DO NOTHING;
