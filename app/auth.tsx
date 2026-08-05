import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
import { isNaverConfigured, useAuth } from '@/hooks/useAuth';

type Mode = 'signin' | 'signup';

/** Optional sign-in. Guests can back out any time — nothing is gated behind it. */
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, signInWithOAuth, signInWithNaver } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = email.includes('@') && password.length >= 6 && !submitting;

  /**
   * Switching between sign-in and sign-up starts clean: a failed-login error
   * left standing over "Create your account" reads as if the new form is
   * already broken, and a password typed for one purpose should not silently
   * become the other.
   *
   * The email is kept on purpose — you almost always want to register the
   * address you just failed to sign in with, and retyping it is pure friction.
   *
   * Only this handler resets. `submit()` also changes mode after a successful
   * sign-up, and that path must keep its "check your email" message.
   */
  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setPassword('');
    setError(null);
    setMessage(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    if (mode === 'signin') {
      const { error: e } = await signIn(email, password);
      setSubmitting(false);
      if (e) return setError(e);
      router.back();
    } else {
      const { error: e, needsConfirmation } = await signUp(email, password);
      setSubmitting(false);
      if (e) return setError(e);
      if (needsConfirmation) {
        setMessage('Check your email to confirm your account, then sign in.');
        setMode('signin');
      } else {
        router.back();
      }
    }
  };

  const finishOAuth = (result: {
    error: string | null;
    cancelled: boolean;
  }) => {
    setSubmitting(false);
    if (result.cancelled) return;
    if (result.error) return setError(result.error);
    router.back();
  };

  const oauth = async (provider: 'google' | 'kakao') => {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    finishOAuth(await signInWithOAuth(provider));
  };

  const naver = async () => {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    finishOAuth(await signInWithNaver());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      {/* There is no scroll view here to swipe the keyboard away with, and a
          password field's return key is the only other exit — so tapping any
          empty space has to dismiss it. accessible={false} keeps the wrapper
          out of the screen reader's way; child presses are unaffected. */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 px-6" style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Close"
            className="h-11 w-11 items-center justify-center rounded-2xl border border-line-strong bg-surface"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>

          <View className="mt-8">
            <Text className="text-3xl font-extrabold text-ink">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Text>
            <Text className="mt-1.5 text-sm text-muted">
              Sign in to sync your saves and reservations across devices. You
              can keep browsing as a guest too.
            </Text>
          </View>

          <View className="mt-7 gap-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              className="h-14 rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink"
            />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Password (6+ characters)"
              placeholderTextColor={colors.faint}
              secureTextEntry
              autoCapitalize="none"
              // "done" closes the keyboard; submitting from here too means the
              // user never has to hunt for a way out.
              returnKeyType="done"
              onSubmitEditing={submit}
              className="h-14 rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink"
            />
          </View>

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
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            )}
          </Pressable>

          {/* Divider */}
          <View className="my-6 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-line-strong" />
            <Text className="text-xs text-faint">or</Text>
            <View className="h-px flex-1 bg-line-strong" />
          </View>

          <View className="gap-3">
            <OAuthButton
              icon="chatbubble"
              label="Continue with Kakao"
              onPress={() => oauth('kakao')}
              backgroundColor="#FEE500"
              borderColor="#FEE500"
              contentColor="#191600"
            />
            {isNaverConfigured ? (
              <OAuthButton
                icon="leaf"
                label="Continue with Naver"
                onPress={naver}
                backgroundColor="#03C75A"
                borderColor="#03C75A"
                contentColor="#FFFFFF"
              />
            ) : null}
            <OAuthButton
              icon="logo-google"
              label="Continue with Google"
              onPress={() => oauth('google')}
            />
          </View>

          <View className="mt-auto items-center pb-6" style={{ gap: 14 }}>
            <Pressable onPress={toggleMode} hitSlop={8}>
              <Text className="text-sm text-muted">
                {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
                <Text className="font-bold text-brand">
                  {mode === 'signin' ? 'Create an account' : 'Sign in'}
                </Text>
              </Text>
            </Pressable>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text className="text-sm font-bold text-muted">
                Continue as guest
              </Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function OAuthButton({
  icon,
  label,
  onPress,
  backgroundColor = colors.surface,
  borderColor = colors.line.strong,
  contentColor = colors.ink,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  backgroundColor?: string;
  borderColor?: string;
  contentColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        backgroundColor,
        borderColor,
      })}
      className="h-14 flex-row items-center justify-center gap-2.5 rounded-2xl border"
    >
      <Ionicons name={icon} size={19} color={contentColor} />
      <Text className="text-base font-bold" style={{ color: contentColor }}>
        {label}
      </Text>
    </Pressable>
  );
}
