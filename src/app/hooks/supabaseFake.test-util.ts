import { vi } from 'vitest';
import { supabase } from '@/lib/supabase';

type FakeError = { message: string } | null;

/** delete().eq()... 체인 끝에서 { error }를 돌려주는 가짜 쿼리 */
type FakeQuery = PromiseLike<{ error: FakeError }> & {
  delete: () => FakeQuery;
  eq: (column: string, value: unknown) => FakeQuery;
  is: (column: string, value: unknown) => FakeQuery;
  neq: (column: string, value: unknown) => FakeQuery;
};

/**
 * supabase.from(table)을 가짜로 바꾼다 (테스트 파일에서 '@/lib/supabase'를 { supabase: { from: vi.fn() } }로 mock한 뒤 사용).
 * errors에 적은 표는 { error }를 돌려준다.
 * 돌려주는 배열에는 쿼리마다 'investment_records.delete().eq(date,2026-11-05).is(batch_id,null)' 같은 기록이 쌓인다.
 */
export function mockSupabaseTables(errors: Readonly<Record<string, string>> = {}): string[] {
  const calls: string[] = [];
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    const index = calls.push(table) - 1;
    const error = errors[table] ? { message: errors[table] } : null;
    const chain = (step: string): FakeQuery => {
      calls[index] += step;
      return query;
    };
    const query: FakeQuery = {
      delete: () => chain('.delete()'),
      eq: (column, value) => chain(`.eq(${column},${String(value)})`),
      is: (column, value) => chain(`.is(${column},${String(value)})`),
      neq: (column, value) => chain(`.neq(${column},${String(value)})`),
      then: (onFulfilled, onRejected) => Promise.resolve({ error }).then(onFulfilled, onRejected),
    };
    return query;
  }) as unknown as typeof supabase.from);
  return calls;
}
