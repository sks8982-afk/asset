import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 로그인 상태를 이 기기에 저장 — 앱을 다시 열어도 자동 로그인 (로그아웃 전까지 유지)
    persistSession: true,
    // 1시간짜리 접근 토큰을 만료 전에 자동 갱신 (오래 켜 둬도 끊기지 않음)
    autoRefreshToken: true,
    // 이메일 링크 로그인은 쓰지 않음
    detectSessionInUrl: false,
  },
});
