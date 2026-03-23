-- investment_records 테이블에 type 컬럼 추가 (매수/매도 구분)
-- 기존 데이터는 모두 'buy'로 간주 (기본값)
ALTER TABLE investment_records
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'buy';

-- type 값 제약
ALTER TABLE investment_records
  ADD CONSTRAINT chk_investment_type CHECK (type IN ('buy', 'sell'));

COMMENT ON COLUMN investment_records.type IS '거래 유형: buy(매수), sell(매도)';
