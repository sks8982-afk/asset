'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import type { FormEvent, ReactNode } from 'react';
import { CircleAlert, LockKeyhole } from 'lucide-react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from './LoadingScreen';

/** useAuth()가 돌려주는 값 */
export interface AuthContextValue {
  /** 현재 로그인 세션. 개발 모드의 '로그인 없이 보기' 중에는 null */
  session: Session | null;
  /**
   * 이 기기에서 로그아웃한다. 성공하면 AuthGate가 로그인 화면으로 바뀐다.
   * 실패하면 화면에 그대로 보여줄 수 있는 한국어 메시지를 error에 담아 돌려준다.
   */
  signOut: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** AuthGate 안쪽 컴포넌트에서 세션과 로그아웃 함수를 쓰는 훅 */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth()는 <AuthGate> 안에서만 사용할 수 있습니다.');
  }
  return value;
}

/** 마지막으로 로그인한 이메일 — 다음 로그인 때 미리 채워 둔다 (비밀번호는 저장하지 않음) */
const LAST_EMAIL_KEY = 'asset-tracker-last-email';

function readLastEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveLastEmail(email: string): void {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, email);
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 기억하지 않는다
  }
}

const SIGN_OUT_ERROR =
  '로그아웃하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';

const LOGIN_ERRORS = {
  empty: '이메일과 비밀번호를 입력해 주세요.',
  invalid: '이메일 또는 비밀번호가 올바르지 않습니다.',
  unconfirmed:
    '이메일 인증이 끝나지 않은 계정입니다. Supabase에서 사용자 상태를 확인해 주세요.',
  rateLimited: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  network: '서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.',
  unknown: '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const;

function toLoginErrorMessage(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) return LOGIN_ERRORS.network;
  if (error.code === 'email_not_confirmed') return LOGIN_ERRORS.unconfirmed;
  if (error.code === 'over_request_rate_limit' || error.status === 429) {
    return LOGIN_ERRORS.rateLimited;
  }
  if (error.code === 'invalid_credentials' || error.status === 400) {
    return LOGIN_ERRORS.invalid;
  }
  return LOGIN_ERRORS.unknown;
}

type AuthGateProps = {
  children: ReactNode;
};

/**
 * 로그인 게이트 (Supabase Auth, 이메일 + 비밀번호).
 * - 세션 확인 중: 로딩 화면
 * - 세션 없음: 로그인 화면
 * - 세션 있음: children 렌더 + useAuth() 제공
 * 화면만 가리는 장치이고, 실제 데이터 보호는 DB의 RLS(docs/sql/2026-11-renewal.sql)가 맡는다.
 */
export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [devBypass, setDevBypass] = useState(false);

  useEffect(() => {
    let active = true;
    // 인증 이벤트가 먼저 오면 그것이 최신 상태이므로 getSession 결과로 덮어쓰지 않는다.
    let receivedEvent = false;

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      receivedEvent = true;
      setSession(nextSession);
      setChecking(false);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: current } }) => {
        if (!active || receivedEvent) return;
        setSession(current);
        setChecking(false);
      })
      .catch(() => {
        if (!active || receivedEvent) return;
        setSession(null);
        setChecking(false);
      });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async (): Promise<{ error: string | null }> => {
    setDevBypass(false);
    try {
      // 'local': 이 기기에서만 로그아웃 (폰·PC 중 다른 기기의 로그인은 유지)
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      return { error: error ? SIGN_OUT_ERROR : null };
    } catch {
      return { error: SIGN_OUT_ERROR };
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, signOut }),
    [session, signOut],
  );

  if (checking) {
    return <LoadingScreen message="로그인 확인 중..." />;
  }

  // 개발 모드 전용 우회. production 빌드에서는 이 조건이 항상 false다.
  const devBypassActive = process.env.NODE_ENV === 'development' && devBypass;

  if (!session && !devBypassActive) {
    return <LoginScreen onDevBypass={() => setDevBypass(true)} />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-[color:var(--border)] bg-[var(--background)] px-4 py-3 text-base text-[var(--foreground)] focus:border-slate-500 focus:outline-hidden focus:ring-1 focus:ring-slate-500';

type LoginScreenProps = {
  /** 개발 모드에서만 보이는 '로그인 없이 보기' 버튼 동작 */
  onDevBypass: () => void;
};

function LoginScreen({ onDevBypass }: LoginScreenProps) {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState(readLastEmail);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(LOGIN_ERRORS.empty);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      // 성공하면 onAuthStateChange(SIGNED_IN)가 AuthGate를 앱 화면으로 바꾼다.
      if (signInError) setError(toLoginErrorMessage(signInError));
      else saveLastEmail(trimmedEmail);
    } catch {
      setError(LOGIN_ERRORS.unknown);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <div className="w-full max-w-sm rounded-2xl border border-[color:var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[var(--background)]">
            <LockKeyhole size={22} className="opacity-70" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-black">자산 추적기</h1>
          <p className="mt-1 text-sm opacity-70">
            본인 계정으로 로그인해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={emailId} className="block text-sm font-bold">
              이메일
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={passwordId} className="block text-sm font-bold">
              비밀번호
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm"
            >
              <CircleAlert
                size={16}
                className="mt-0.5 shrink-0 text-rose-500"
                aria-hidden="true"
              />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[var(--foreground)] py-3 text-sm font-black text-[var(--background)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-50"
          >
            {submitting ? '로그인 중…' : '로그인'}
          </button>
          <p className="text-center text-xs opacity-60">
            한 번 로그인하면 이 기기에서는 로그아웃할 때까지 유지됩니다.
          </p>
        </form>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 border-t border-[color:var(--border)] pt-4">
            <button
              type="button"
              onClick={onDevBypass}
              className="w-full rounded-xl border border-dashed border-[color:var(--border)] py-2.5 text-xs font-bold opacity-70 hover:opacity-100"
            >
              로컬 개발: 로그인 없이 보기
            </button>
            <p className="mt-2 text-center text-[11px] opacity-60">
              개발 모드 전용 · DB에 RLS를 켠 뒤에는 데이터가 보이지 않습니다.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
