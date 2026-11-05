-- =====================================================================
-- 2026-11 리뉴얼 1단계 — 설정 컬럼 추가 + 장부 테이블 잠금(RLS)
-- 대상: Supabase (Postgres 15)
-- 실행: Dashboard → SQL Editor에 이 파일 전체를 붙여 넣고 Run
-- 여러 번 실행해도 결과는 같습니다.
-- =====================================================================
--
-- ■ 실행 순서 (반드시 이 순서대로)
--   (1) 새 코드 배포
--       로그인 화면이 있는 버전이 먼저 배포되어 있어야 합니다.
--       이 SQL을 먼저 실행하면 로그인 기능이 없는 예전 앱은 장부를 읽지도 쓰지도 못합니다.
--   (2) Supabase Dashboard → Authentication → Users → Add user
--       본인 이메일/비밀번호로 사용자 1명 생성 ("Auto Confirm User" 체크).
--   (3) Authentication 설정에서 신규 가입(Allow new users to sign up) 끄기
--       익명 로그인(Allow anonymous sign-ins)도 꺼져 있는지 확인.
--       아래 정책은 "로그인한 사용자라면 누구나" 전체 접근을 허용합니다(1인용 앱 전제).
--       가입이나 익명 로그인이 열려 있으면 누구나 계정을 만들어 장부를 볼 수 있습니다.
--   (4) 이 SQL 실행
--       DROP POLICY 때문에 "파괴적 작업" 확인 창이 뜨면 내용을 확인하고 실행하세요.
--       맨 아래 확인 쿼리 결과 표로 잠금 상태를 볼 수 있습니다.
--   (5) 앱에서 로그인 → 장부가 보이는지 확인
--
-- ■ 참고
--   - 전체가 하나의 트랜잭션입니다. 중간에 오류가 나면 아무것도 바뀌지 않습니다.
--   - 앞으로 public 스키마에 새 테이블을 만들면 같은 잠금(B 섹션)을 적용해야 합니다.
--     Supabase 기본 설정은 새 테이블에 anon 권한을 줍니다.
--   - 롤백: 파일 맨 아래 주석 블록 (주석을 풀어 따로 실행)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- A. 설정 컬럼 — 설정을 app_settings(id = 1 한 행)에 저장해 폰·PC에서 같게 쓰기 위함
--    모두 NULL 허용, 기본값 없음 (NULL = 아직 브라우저 값을 DB로 옮기지 않은 상태)
-- ---------------------------------------------------------------------
alter table public.app_settings
  add column if not exists monthly_budget numeric,  -- 월 적립 예산 (원)
  add column if not exists core_weights   jsonb,    -- 코어 비율 (S&P500 / 나스닥100)
  add column if not exists cma_rate       numeric,  -- CMA 연 이율
  add column if not exists goal_asset     numeric,  -- 목표 자산 (원)
  add column if not exists goal_roi       numeric,  -- 목표 수익률
  add column if not exists ips_rules      jsonb,    -- 투자 원칙 점검 설정
  add column if not exists isa_open_date  date;     -- ISA 가입일

-- ---------------------------------------------------------------------
-- B. 장부 테이블 잠금 — 로그인한 사용자(authenticated)만 접근, 공개 키(anon)로는 접근 불가
--    테이블마다:
--      1) RLS 켜기
--      2) 기존 정책 전부 삭제
--         정책은 OR로 합쳐지므로 예전 anon 허용 정책이 하나라도 남으면 계속 열려 있음
--      3) authenticated 전체 허용 정책 1개 생성
--      4) anon 권한 전부 회수, authenticated는 앱에 필요한 권한 보장
--    없는 테이블은 건너뜁니다.
-- ---------------------------------------------------------------------
do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array[
    'monthly_budgets',
    'investment_records',
    'cash_balance_snapshots',
    'batch_summaries',
    'app_settings',
    'dividends'
  ]
  loop
    if not exists (
      select 1
      from pg_catalog.pg_tables
      where schemaname = 'public' and tablename = tbl
    ) then
      raise notice '건너뜀: public.% 테이블이 없습니다.', tbl;
      continue;
    end if;

    -- 1) RLS 켜기
    execute format('alter table public.%I enable row level security', tbl);

    -- 2) 기존 정책 전부 삭제
    for pol in
      select policyname
      from pg_catalog.pg_policies
      where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy %I on public.%I', pol.policyname, tbl);
    end loop;

    -- 3) 로그인 사용자 전체 허용 정책 1개
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      'authenticated_full_access',
      tbl
    );

    -- 4) 권한 정리
    execute format('revoke all on table public.%I from anon', tbl);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      tbl
    );

    raise notice '잠금 완료: public.%', tbl;
  end loop;
end
$$;

-- ---------------------------------------------------------------------
-- C. 예전 테이블 asset_history — 앱에서 더 이상 쓰지 않음 (/api/seed가 넣던 가짜 데이터)
--    RLS만 켜고 정책은 두지 않음 → anon·authenticated 모두 접근 불가
--    필요 없으면 지워도 됩니다:  drop table if exists public.asset_history;
-- ---------------------------------------------------------------------
do $$
declare
  pol record;
begin
  if not exists (
    select 1
    from pg_catalog.pg_tables
    where schemaname = 'public' and tablename = 'asset_history'
  ) then
    raise notice '건너뜀: public.asset_history 테이블이 없습니다.';
    return;
  end if;

  execute 'alter table public.asset_history enable row level security';

  for pol in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'asset_history'
  loop
    execute format('drop policy %I on public.asset_history', pol.policyname);
  end loop;

  execute 'revoke all on table public.asset_history from anon';

  raise notice '잠금 완료: public.asset_history (정책 없음: anon·authenticated 모두 접근 불가)';
end
$$;

commit;

-- ---------------------------------------------------------------------
-- 확인 (읽기 전용) — 결과 표에서 다음을 확인하세요.
--   잠근 테이블   : rls = true, policies = 1, anon_select = false, auth_crud = true
--   asset_history : rls = true, policies = 0, anon_select = false
--   그 밖의 항목 중 anon_select = true 이면서 rls = false 이거나 kind = view/matview 인 것이
--   있으면 공개 키로 읽힐 수 있는 상태이니 따로 확인이 필요합니다.
-- ---------------------------------------------------------------------
select
  c.relname as name,
  case c.relkind when 'v' then 'view' when 'm' then 'matview' else 'table' end as kind,
  c.relrowsecurity as rls,
  (select count(*) from pg_catalog.pg_policy p where p.polrelid = c.oid) as policies,
  has_table_privilege('anon', c.oid, 'select') as anon_select,
  has_table_privilege('authenticated', c.oid, 'select')
    and has_table_privilege('authenticated', c.oid, 'insert')
    and has_table_privilege('authenticated', c.oid, 'update')
    and has_table_privilege('authenticated', c.oid, 'delete') as auth_crud
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p', 'v', 'm')
order by kind, name;

-- =====================================================================
-- 롤백 — 로그인이 안 되는 등 문제가 있을 때만, 주석(--)을 풀어 이 블록만 실행
--   잠금을 풀어 예전처럼 공개 키(anon)로 읽기/쓰기가 되게 되돌립니다. (다시 공개 상태가 됨)
--   지운 예전 정책은 되살아나지 않지만, RLS를 끄면 정책과 상관없이 접근됩니다.
--   A 섹션 컬럼은 남겨 두어도 예전 코드에 영향이 없습니다.
-- =====================================================================
-- do $$
-- declare
--   tbl text;
-- begin
--   foreach tbl in array array[
--     'monthly_budgets', 'investment_records', 'cash_balance_snapshots',
--     'batch_summaries', 'app_settings', 'dividends', 'asset_history'
--   ]
--   loop
--     if exists (
--       select 1 from pg_catalog.pg_tables
--       where schemaname = 'public' and tablename = tbl
--     ) then
--       execute format('drop policy if exists %I on public.%I', 'authenticated_full_access', tbl);
--       execute format('alter table public.%I disable row level security', tbl);
--       execute format('grant all on table public.%I to anon', tbl);
--     end if;
--   end loop;
-- end
-- $$;
