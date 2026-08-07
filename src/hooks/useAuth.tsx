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
  /** Emails a recovery link that deep-links back to /reset-password. */
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Sets a new password for the session the recovery link established. */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  /**
   * Changes the password of the signed-in user. `current` is verified first
   * when they already have one; pass null for an OAuth-only account that is
   * setting a password for the first time (see `hasPassword`).
   */
  changePassword: (
    current: string | null,
    next: string,
  ) => Promise<{ error: string | null }>;
  /** True when the account has an email/password identity to change. */
  hasPassword: boolean;
  signOut: () => Promise<void>;
  /**
   * Permanently deletes the signed-in account and everything it owns. There is
   * no undo and no grace period — see the delete-account Edge Function.
   */
  deleteAccount: () => Promise<{ error: string | null }>;
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
      requestPasswordReset: async (email) => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
        // Supabase sends a link to its own /verify endpoint, which redirects
        // here with a `code` the reset screen exchanges for a session. The
        // resolved URL must be allow-listed under Authentication → URL
        // Configuration, same as the OAuth callback.
        const redirectTo = Linking.createURL('reset-password');
        const { error } = await getSupabase().auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo },
        );
        return { error: error?.message ?? null };
      },
      updatePassword: async (password) => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
        const { error } = await getSupabase().auth.updateUser({ password });
        return { error: error?.message ?? null };
      },
      changePassword: async (current, next) => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
        const supabase = getSupabase();
        const email = session?.user?.email;
        // Supabase does not ask for the old password, so anyone holding an
        // unlocked phone could change it and lock the owner out. Verify first
        // when there is one to verify.
        if (current !== null) {
          if (!email) return { error: 'This account has no email address.' };
          const { error: reauth } = await supabase.auth.signInWithPassword({
            email,
            password: current,
          });
          if (reauth) return { error: 'That current password is not right.' };
        }
        const { error } = await supabase.auth.updateUser({ password: next });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        if (isSupabaseConfigured) await getSupabase().auth.signOut();
      },
      deleteAccount: async () => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
        const supabase = getSupabase();
        const { data, error } = await supabase.functions.invoke<{
          ok?: boolean;
          error?: string;
        }>('delete-account', { method: 'POST' });
        // invoke() only rejects on transport/non-2xx; a 500 carrying our own
        // { error } message arrives as `error` with the body hidden, so report
        // whichever we actually got rather than a generic failure.
        if (error) return { error: data?.error ?? error.message };
        if (data?.error) return { error: data.error };
        // The account is gone but this device still holds its tokens. Clear
        // them locally so the app returns to guest state instead of retrying
        // with a session whose user no longer exists.
        await supabase.auth.signOut();
        return { error: null };
      },
      // An OAuth-only account has no `email` identity, so there is no current
      // password to confirm — it is setting one, not changing one.
      hasPassword: !!session?.user?.identities?.some(
        (i) => i.provider === 'email',
      ),
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
