import { vi } from 'vitest';
import { supabase } from '@/lib/supabase';

type FakeError = { message: string } | null;
type FakeResult = { data: unknown; error: FakeError };

/** 표마다 돌려줄 값 — 고정값이거나, 그 쿼리의 기록(call)을 보고 정하는 함수 */
export type FakeResponder<T> = T | ((call: string) => T);

/** 성공했을 때 돌려줄 data (행 배열·한 행·없음) */
type FakeData = readonly unknown[] | Record<string, unknown> | null | undefined;

/** 쿼리 체인 끝에서 { data, error }를 돌려주는 가짜 쿼리 */
type FakeQuery = PromiseLike<FakeResult> & {
  select: (columns?: string) => FakeQuery;
  insert: (values: unknown) => FakeQuery;
  update: (values: unknown) => FakeQuery;
  upsert: (values: unknown, options?: unknown) => FakeQuery;
  delete: () => FakeQuery;
  eq: (column: string, value: unknown) => FakeQuery;
  is: (column: string, value: unknown) => FakeQuery;
  neq: (column: string, value: unknown) => FakeQuery;
  gte: (column: string, value: unknown) => FakeQuery;
  lt: (column: string, value: unknown) => FakeQuery;
  order: (column: string, options?: unknown) => FakeQuery;
  maybeSingle: () => FakeQuery;
};

function respond<T>(responder: FakeResponder<T> | undefined, call: string): T | undefined {
  return typeof responder === 'function' ? (responder as (call: string) => T)(call) : responder;
}

/**
 * supabase.from(table)을 가짜로 바꾼다 (테스트 파일에서 '@/lib/supabase'를 { supabase: { from: vi.fn() } }로 mock한 뒤 사용).
 * - errors: 표 → 오류 문구 (함수면 쿼리 기록을 보고 정한다, 빈 값이면 성공)
 * - data: 표 → 성공했을 때 돌려줄 data (함수면 쿼리 기록을 보고 정한다, 없으면 null)
 * 돌려주는 배열에는 쿼리마다 'investment_records.delete().eq(date,2026-11-05).is(batch_id,null)' 같은 기록이 쌓인다
 * (insert·update·upsert 값은 JSON으로 적는다).
 */
export function mockSupabaseTables(
  errors: Readonly<Record<string, FakeResponder<string | null | undefined>>> = {},
  data: Readonly<Record<string, FakeResponder<FakeData>>> = {},
): string[] {
  const calls: string[] = [];
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    const index = calls.push(table) - 1;
    const chain = (step: string): FakeQuery => {
      calls[index] += step;
      return query;
    };
    const query: FakeQuery = {
      select: (columns = '*') => chain(`.select(${columns})`),
      insert: (values) => chain(`.insert(${JSON.stringify(values)})`),
      update: (values) => chain(`.update(${JSON.stringify(values)})`),
      upsert: (values) => chain(`.upsert(${JSON.stringify(values)})`),
      delete: () => chain('.delete()'),
      eq: (column, value) => chain(`.eq(${column},${String(value)})`),
      is: (column, value) => chain(`.is(${column},${String(value)})`),
      neq: (column, value) => chain(`.neq(${column},${String(value)})`),
      gte: (column, value) => chain(`.gte(${column},${String(value)})`),
      lt: (column, value) => chain(`.lt(${column},${String(value)})`),
      order: (column) => chain(`.order(${column})`),
      maybeSingle: () => chain('.maybeSingle()'),
      then: (onFulfilled, onRejected) => {
        const call = calls[index];
        const message = respond(errors[table], call);
        const result: FakeResult = message
          ? { data: null, error: { message } }
          : { data: respond(data[table], call) ?? null, error: null };
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    };
    return query;
  }) as unknown as typeof supabase.from);
  return calls;
}
