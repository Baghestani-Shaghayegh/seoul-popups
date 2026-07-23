import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthValue {
  session: Session | null;
  user: User | null;
  /** True while the initial session is being restored. */
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const NOT_CONFIGURED = 'Sign-in is unavailable — Supabase isn’t configured.';

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Optional accounts. The app is fully usable as a guest — this just enables
 * signing in so saves/reservations can sync once those move server-side.
 * Session is persisted by the Supabase client (AsyncStorage) and restored on
 * launch. Email/password works today; Apple/Google need providers enabled in
 * the Supabase dashboard.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
        const { error } = await getSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return { error: error?.message ?? null };
      },
      signUp: async (email, password) => {
        if (!isSupabaseConfigured)
          return { error: NOT_CONFIGURED, needsConfirmation: false };
        const { data, error } = await getSupabase().auth.signUp({
          email: email.trim(),
          password,
        });
        // No session back → the project requires email confirmation first.
        return {
          error: error?.message ?? null,
          needsConfirmation: !error && !data.session,
        };
      },
      signOut: async () => {
        if (isSupabaseConfigured) await getSupabase().auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
