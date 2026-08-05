import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { usePopups } from '@/hooks/usePopups';
import { useProfile } from '@/hooks/useProfile';
import { useVisited } from '@/hooks/useVisited';
import { pickAndUploadAvatar } from '@/lib/uploadAvatar';

/**
 * My Page — the one place to change your name and photo.
 *
 * Registered with the `plan` screen options (card + native header) rather than
 * auth's modal: this is a destination you go back from, not an interruption you
 * dismiss. The native header owns the top inset, so only insets.bottom is
 * applied here — adding paddingTop would double-pad.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { displayName, avatarUrl, setDisplayName, setAvatarUrl } = useProfile();
  const { favoriteIds } = useFavorites();
  const { visitedIds } = useVisited();
  const { popups } = usePopups({});

  const [name, setName] = useState(displayName ?? '');
  // useState only reads its initial value once, and the profile loads
  // asynchronously — so on a cold start `displayName` is still null at mount
  // and the field would stay empty forever, hiding the name the user already
  // has. Sync it in, but never over text they are mid-way through typing.
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited) setName(displayName ?? '');
  }, [displayName, edited]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isGuest = !user;
  // Counted against the loaded catalogue, matching saved.tsx — a raw id count
  // would include saves whose pop-up is gone, so this screen would disagree
  // with the Saved tab and read as a bug.
  const savedCount = popups.filter((p) => favoriteIds.includes(p.id)).length;
  const visitedCount = popups.filter((p) => visitedIds.includes(p.id)).length;

  const canSave = name.trim().length > 0 && name.trim() !== (displayName ?? '');

  const onSave = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    const { error: e } = await setDisplayName(name);
    setSaving(false);
    if (e) return setError(e);
    // Back in sync with the server, so let external updates flow in again.
    setEdited(false);
    setMessage('Saved.');
  };

  const onChangePhoto = async () => {
    if (!user) return;
    setError(null);
    setMessage(null);
    setUploading(true);
    const { url, error: e } = await pickAndUploadAvatar(user.id);
    if (e) {
      setUploading(false);
      return setError(e);
    }
    if (!url) return setUploading(false); // cancelled
    const { error: saveErr } = await setAvatarUrl(url);
    setUploading(false);
    if (saveErr) return setError(saveErr);
    setMessage('Photo updated.');
  };

  const doSignOut = async () => {
    await signOut();
    router.back();
  };

  /**
   * react-native-web ships `class Alert { static alert() {} }` — an empty
   * no-op. Routing sign-out through it made the button silently dead on web:
   * no dialog, no sign-out, no error. Confirm with the browser's own dialog
   * there and keep the native Alert on device.
   */
  const onSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out? Your saves stay on this device.')) {
        void doSignOut();
      }
      return;
    }
    Alert.alert('Sign out?', 'Your saves stay on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void doSignOut(),
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      // Swiping the list closes the keyboard, so the name field is never a
      // dead end. "interactive" follows the finger on iOS; Android has no
      // equivalent and falls back to dismissing on drag.
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    >
      {/* Avatar */}
      <View className="items-center pt-2">
        <Avatar
          uri={avatarUrl}
          name={displayName}
          email={user?.email}
          size={96}
          rounded="full"
          guest={isGuest}
        />
        {!isGuest && (
          <Pressable
            onPress={onChangePhoto}
            disabled={uploading}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            className="mt-3 h-6 justify-center"
          >
            {uploading ? (
              <ActivityIndicator color={colors.brand.DEFAULT} />
            ) : (
              <Text className="text-sm font-bold text-brand">Change photo</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Display name */}
      <Text className="mb-1.5 mt-7 text-xs font-bold uppercase tracking-wide text-muted">
        Display name
      </Text>
      <TextInput
        value={name}
        onChangeText={(t) => {
          setEdited(true);
          setName(t);
        }}
        placeholder="What should we call you?"
        placeholderTextColor={colors.faint}
        maxLength={40}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={() => {
          Keyboard.dismiss();
          if (canSave) void onSave();
        }}
        className="h-14 rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink"
      />
      <Pressable
        onPress={onSave}
        disabled={!canSave || saving}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        className={`mt-3 h-14 flex-row items-center justify-center rounded-2xl ${
          canSave && !saving ? 'bg-brand' : 'bg-line-strong'
        }`}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            className={`text-base font-extrabold ${
              canSave ? 'text-white' : 'text-muted'
            }`}
          >
            Save
          </Text>
        )}
      </Pressable>

      {error ? (
        <Text className="mt-3 text-sm font-semibold text-brand">{error}</Text>
      ) : null}
      {message ? (
        <Text className="mt-3 text-sm font-semibold text-purple">
          {message}
        </Text>
      ) : null}

      {/* Counts */}
      <View className="mt-7 flex-row gap-3">
        <Pressable
          onPress={() => router.push('/saved')}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="flex-1 rounded-3xl bg-brand-light p-4"
        >
          <Text className="text-2xl font-extrabold text-brand-dark">
            {savedCount}
          </Text>
          <Text className="mt-0.5 text-xs font-bold text-brand-dark">
            Saved
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/saved')}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="flex-1 rounded-3xl bg-purple-light p-4"
        >
          <Text className="text-2xl font-extrabold text-purple">
            {visitedCount}
          </Text>
          <Text className="mt-0.5 text-xs font-bold text-purple">
            Been there
          </Text>
        </Pressable>
      </View>

      {/* Account */}
      {isGuest ? (
        <Pressable
          onPress={() => router.push('/auth')}
          style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
          className="mt-7 flex-row items-center justify-between rounded-2xl bg-purple-light p-3.5"
        >
          <View className="flex-row items-center gap-2.5">
            <Ionicons
              name="person-circle-outline"
              size={22}
              color={colors.purple.DEFAULT}
            />
            <Text className="text-sm font-bold text-ink">
              Sign in to sync your saves
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.purple.DEFAULT}
          />
        </Pressable>
      ) : (
        <>
          <Text className="mb-1.5 mt-7 text-xs font-bold uppercase tracking-wide text-muted">
            Email
          </Text>
          <View className="rounded-2xl border border-line-strong bg-surface p-4">
            <Text className="text-base text-ink">{user.email}</Text>
          </View>

          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            className="mt-7 h-14 items-center justify-center rounded-2xl border border-line-strong bg-surface"
          >
            <Text className="text-base font-extrabold text-brand">
              Sign out
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
