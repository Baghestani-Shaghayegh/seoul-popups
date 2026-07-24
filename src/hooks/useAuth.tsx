import type { Provider, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

// Dismisses the auth popup if the app is reopened mid-flow (web/native no-op).
WebBrowser.maybeCompleteAuthSession();

// Kakao is Supabase-native and dominant in Korea; Apple is deferred until the
// paid Apple Developer account exists (see supabase/AUTH.md).
type OAuthProvider = Extract<Provider, 'google' | 'kakao' | 'apple'>;

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
  signInWithOAuth: (
    provider: OAuthProvider,
  ) => Promise<{ error: string | null; cancelled: boolean }>;
  /** Custom Naver flow (no native Supabase provider). */
  signInWithNaver: () => Promise<{ error: string | null; cancelled: boolean }>;
  signOut: () => Promise<void>;
}

const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID;
/** True when a Naver app is configured — gates the Naver button. */
export const isNaverConfigured = Boolean(NAVER_CLIENT_ID);

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
      signInWithOAuth: async (provider) => {
        if (!isSupabaseConfigured)
          return { error: NOT_CONFIGURED, cancelled: false };
        const supabase = getSupabase();
        const redirectTo = Linking.createURL('auth/callback');
        // skipBrowserRedirect: we drive the browser ourselves so we can catch
        // the redirect back and exchange the PKCE code for a session in-app.
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) return { error: error.message, cancelled: false };
        if (!data?.url)
          return { error: 'Could not start sign-in.', cancelled: false };

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
        );
        if (result.type !== 'success') return { error: null, cancelled: true };
        const code = Linking.parse(result.url).queryParams?.code;
        if (typeof code !== 'string')
          return { error: 'Sign-in was interrupted.', cancelled: false };
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        return { error: exchangeError?.message ?? null, cancelled: false };
      },
      signInWithNaver: async () => {
        if (!isSupabaseConfigured)
          return { error: NOT_CONFIGURED, cancelled: false };
        if (!NAVER_CLIENT_ID)
          return { error: 'Naver isn’t configured yet.', cancelled: false };
        const supabase = getSupabase();
        // Naver's registered callback = our public naver-auth Edge Function,
        // which redirects back to the app scheme with { email, otp }.
        const redirectUri = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/naver-auth`;
        const state = Math.random().toString(36).slice(2);
        const authUrl =
          'https://nid.naver.com/oauth2.0/authorize?' +
          new URLSearchParams({
            response_type: 'code',
            client_id: NAVER_CLIENT_ID,
            redirect_uri: redirectUri,
            state,
          }).toString();

        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          'seoulpopups://auth/callback',
        );
        if (result.type !== 'success') return { error: null, cancelled: true };

        const params = Linking.parse(result.url).queryParams ?? {};
        if (typeof params.error === 'string')
          return { error: `Naver: ${params.error}`, cancelled: false };
        const { email, otp } = params;
        if (typeof email !== 'string' || typeof otp !== 'string')
          return { error: 'Naver sign-in was interrupted.', cancelled: false };

        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'magiclink',
        });
        return { error: error?.message ?? null, cancelled: false };
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
