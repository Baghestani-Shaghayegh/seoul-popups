import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'signin' | 'signup';

/** Optional sign-in. Guests can back out any time — nothing is gated behind it. */
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, signInWithOAuth } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.includes('@') && password.length >= 6 && !submitting;

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

  const oauth = async (provider: 'google' | 'kakao') => {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const { error: e, cancelled } = await signInWithOAuth(provider);
    setSubmitting(false);
    if (cancelled) return;
    if (e) return setError(e);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
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
            Sign in to sync your saves and reservations across devices. You can
            keep browsing as a guest too.
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
            className="h-14 rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (6+ characters)"
            placeholderTextColor={colors.faint}
            secureTextEntry
            autoCapitalize="none"
            className="h-14 rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink"
          />
        </View>

        {error ? (
          <Text className="mt-3 text-sm font-semibold text-brand">{error}</Text>
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
          <OAuthButton
            icon="logo-google"
            label="Continue with Google"
            onPress={() => oauth('google')}
          />
        </View>

        <View className="mt-auto items-center pb-6" style={{ gap: 14 }}>
          <Pressable
            onPress={() =>
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            }
            hitSlop={8}
          >
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
