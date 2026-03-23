-- 배당금 기록 테이블
CREATE TABLE IF NOT EXISTS dividends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  asset_key TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_reinvested BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dividends_date ON dividends(date);
CREATE INDEX IF NOT EXISTS idx_dividends_asset_key ON dividends(asset_key);
