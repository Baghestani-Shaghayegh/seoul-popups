import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Where the emailed recovery link lands.
 *
 * Supabase's link goes to its own /verify endpoint, which redirects to the
 * `redirectTo` from `requestPasswordReset` carrying a `code`. That code is
 * exchanged for a short-lived session here — the same PKCE exchange the OAuth
 * flow in useAuth does — and only then can `updateUser({ password })` work.
 *
 * Without the exchange the screen would look fine and every save would fail
 * with "Auth session missing", so the exchange state is surfaced rather than
 * hidden behind a spinner.
 */
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updatePassword } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!isSupabaseConfigured) {
        if (active)
          setError('Sign-in is unavailable — Supabase isn’t configured.');
        return;
      }
      // Already signed in via the link (web can auto-detect it), or no code to
      // exchange — either way, let the form decide by trying the update.
      if (!params.code) {
        const { data } = await getSupabase().auth.getSession();
        if (active) {
          setReady(!!data.session);
          if (!data.session) {
            setError('This reset link is invalid or has expired.');
          }
        }
        return;
      }
      const { error: e } = await getSupabase().auth.exchangeCodeForSession(
        String(params.code),
      );
      if (!active) return;
      if (e) return setError('This reset link is invalid or has expired.');
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [params.code]);

  const canSubmit =
    ready && password.length >= 6 && password === confirm && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const { error: e } = await updatePassword(password);
    setSubmitting(false);
    if (e) return setError(e);
    setMessage('Password updated. You’re signed in.');
    router.replace('/');
  };

  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 px-6" style={{ paddingTop: insets.top + 8 }}>
          <View className="mt-8">
            <Text className="text-3xl font-extrabold text-ink">
              Set a new password
            </Text>
            <Text className="mt-1.5 text-sm text-muted">
              Choose something at least 6 characters long.
            </Text>
          </View>

          <View className="mt-7 gap-3">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
              placeholderTextColor={colors.faint}
              secureTextEntry
              autoCapitalize="none"
              editable={ready}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => confirmRef.current?.focus()}
              className="h-14 rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink"
            />
            <TextInput
              ref={confirmRef}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat new password"
              placeholderTextColor={colors.faint}
              secureTextEntry
              autoCapitalize="none"
              editable={ready}
              returnKeyType="done"
              onSubmitEditing={submit}
              className="h-14 rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink"
            />
          </View>

          {mismatch ? (
            <Text className="mt-3 text-sm font-semibold text-brand">
              Those don’t match.
            </Text>
          ) : null}
          {error ? (
            <Text className="mt-3 text-sm font-semibold text-brand">
              {error}
            </Text>
          ) : null}
          {message ? (
            <Text className="mt-3 text-sm font-semibold text-purple">
              {message}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            className={`mt-5 h-14 flex-row items-center justify-center rounded-2xl ${
              canSubmit ? 'bg-brand' : 'bg-line-strong'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className={`text-base font-bold ${
                  canSubmit ? 'text-white' : 'text-muted'
                }`}
              >
                Save password
              </Text>
            )}
          </Pressable>

          <View className="mt-auto items-center pb-6">
            <Pressable onPress={() => router.replace('/auth')} hitSlop={8}>
              <Text className="text-sm font-bold text-muted">
                Back to sign in
              </Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
