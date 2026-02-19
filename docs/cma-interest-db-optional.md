# CMA 이자 DB 저장 (선택 사항)

앱에서는 **입금(monthly_budgets) + 매수(investment_records)**만으로 매일 CMA 잔액과 누적 이자를 계산합니다.  
필요하면 아래처럼 DB에 이자율·일별 이자를 저장해 두고 쿼리할 수 있습니다.

## 1. CMA 연 이자율 저장 (설정용)

지금은 `localStorage`에만 저장됩니다. DB에 두려면:

```sql
-- 예: 설정 테이블에 키-값으로 저장 (Supabase/PostgreSQL)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_settings (key, value) VALUES ('cma_rate', '1.95')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

## 2. 일별 CMA 잔액 / 일별 이자 저장 (로그용)

매일 잔액·이자를 남기고 싶다면 (Supabase/PostgreSQL):

```sql
CREATE TABLE IF NOT EXISTS cma_daily (
  date DATE PRIMARY KEY,
  balance NUMERIC NOT NULL DEFAULT 0,
  interest_accrued NUMERIC NOT NULL DEFAULT 0,
  cumulative_interest NUMERIC NOT NULL DEFAULT 0
);

-- 예: 2025-01-15 기준
-- INSERT INTO cma_daily (date, balance, interest_accrued, cumulative_interest)
-- VALUES ('2025-01-15', 500000, 26.71, 312.50);
```

- `balance`: 해당 일 마감 CMA 잔액 (원)
- `interest_accrued`: 그날 하루 쌓인 이자 (원)
- `cumulative_interest`: 당일까지 누적 이자 (원)

앱에서는 **DB 없이** `monthly_budgets`와 `investment_records`만으로 같은 값을 계산하므로, 이 테이블은 백업·리포트용으로만 쓰면 됩니다.
