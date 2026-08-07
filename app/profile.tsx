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
import { PRIVACY_POLICY_URL, SUPPORT_URL } from '@/constants/legal';
import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { usePopups } from '@/hooks/usePopups';
import { useProfile } from '@/hooks/useProfile';
import { useVisited } from '@/hooks/useVisited';
import { openExternalUrl } from '@/lib/links';
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
  const {
    user,
    signOut,
    loading: authLoading,
    changePassword,
    hasPassword,
    deleteAccount,
  } = useAuth();
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

  // My Page is for people with an account. The header already sends guests to
  // /auth, but guard the screen too so a deep link or a sign-out while it is
  // open cannot leave someone looking at an empty profile. `authLoading`
  // matters: `user` is null while the stored session is being restored, and
  // redirecting then would bounce a signed-in user to the sign-in sheet.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth');
  }, [authLoading, user, router]);

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

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  const canChangePw =
    newPw.length >= 6 && (!hasPassword || currentPw.length > 0) && !pwSaving;

  const onChangePassword = async () => {
    if (!canChangePw) return;
    setPwError(null);
    setPwMessage(null);
    setPwSaving(true);
    const { error: e } = await changePassword(
      hasPassword ? currentPw : null,
      newPw,
    );
    setPwSaving(false);
    if (e) return setPwError(e);
    setCurrentPw('');
    setNewPw('');
    setPwMessage('Password updated.');
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

  const [deleting, setDeleting] = useState(false);

  const doDeleteAccount = async () => {
    setError(null);
    setMessage(null);
    setDeleting(true);
    const { error: e } = await deleteAccount();
    if (e) {
      setDeleting(false);
      return setError(e);
    }
    // deleteAccount() has already cleared the local session, so the guard
    // effect above would bounce to /auth on its own. Go home instead: being
    // dropped on a sign-in sheet right after deleting an account reads as
    // "that didn't work". The app is fully usable as a guest.
    router.replace('/');
  };

  /**
   * Required by App Store Guideline 5.1.1(v), and irreversible — so it asks
   * twice, and the second prompt spells out what goes rather than repeating
   * "are you sure". Same web/native split as onSignOut: react-native-web's
   * Alert is a no-op, which would make this button silently dead in the browser.
   */
  const CONFIRM_TITLE = 'Delete account?';
  const CONFIRM_BODY =
    'This permanently deletes your profile, photo, saved pop-ups, and visits. It cannot be undone.';

  const onDeleteAccount = () => {
    if (deleting) return;
    if (Platform.OS === 'web') {
      if (window.confirm(`${CONFIRM_TITLE}\n\n${CONFIRM_BODY}`)) {
        void doDeleteAccount();
      }
      return;
    }
    Alert.alert(CONFIRM_TITLE, CONFIRM_BODY, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Last chance',
            'There is no undo and no grace period. Delete this account?',
            [
              { text: 'Keep my account', style: 'cancel' },
              {
                text: 'Delete forever',
                style: 'destructive',
                onPress: () => void doDeleteAccount(),
              },
            ],
          ),
      },
    ]);
  };

  // Nothing to show without an account; the effect above is already sending
  // them to /auth. Rendering the signed-in layout with empty values first
  // would flash a blank profile on the way there.
  if (!user) return <View className="flex-1 bg-bg" />;

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
          email={user.email}
          size={96}
          rounded="full"
        />
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
      <Text className="mb-1.5 mt-7 text-xs font-bold uppercase tracking-wide text-muted">
        Email
      </Text>
      <View className="rounded-2xl border border-line-strong bg-surface p-4">
        <Text className="text-base text-ink">{user.email}</Text>
      </View>

      {/* Password. Titled for what it actually does: an account created with
          Google has no password until this sets one. */}
      <Text className="mb-1.5 mt-7 text-xs font-bold uppercase tracking-wide text-muted">
        {hasPassword ? 'Change password' : 'Set a password'}
      </Text>
      <View className="gap-3">
        {hasPassword ? (
          <TextInput
            value={currentPw}
            onChangeText={setCurrentPw}
            placeholder="Current password"
            placeholderTextColor={colors.faint}
            secureTextEntry
            autoCapitalize="none"
            className="h-14 rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink"
          />
        ) : null}
        <TextInput
          value={newPw}
          onChangeText={setNewPw}
          placeholder="New password (6+ characters)"
          placeholderTextColor={colors.faint}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={() => {
            Keyboard.dismiss();
            if (canChangePw) void onChangePassword();
          }}
          className="h-14 rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink"
        />
      </View>
      <Pressable
        onPress={onChangePassword}
        disabled={!canChangePw}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        className={`mt-3 h-14 flex-row items-center justify-center rounded-2xl ${
          canChangePw ? 'bg-brand' : 'bg-line-strong'
        }`}
      >
        {pwSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            className={`text-base font-extrabold ${
              canChangePw ? 'text-white' : 'text-muted'
            }`}
          >
            {hasPassword ? 'Update password' : 'Set password'}
          </Text>
        )}
      </Pressable>
      {pwError ? (
        <Text className="mt-3 text-sm font-semibold text-brand">{pwError}</Text>
      ) : null}
      {pwMessage ? (
        <Text className="mt-3 text-sm font-semibold text-purple">
          {pwMessage}
        </Text>
      ) : null}

      <Pressable
        onPress={onSignOut}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        className="mt-7 h-14 items-center justify-center rounded-2xl border border-line-strong bg-surface"
      >
        <Text className="text-base font-extrabold text-brand">Sign out</Text>
      </Pressable>

      {/* Legal. App Store Connect wants these reachable from inside the app,
          not only on the store listing. */}
      <View className="mt-7 flex-row justify-center gap-6">
        <Pressable
          onPress={() => openExternalUrl(PRIVACY_POLICY_URL)}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="text-sm font-semibold text-muted">
            Privacy policy
          </Text>
        </Pressable>
        <Pressable
          onPress={() => openExternalUrl(SUPPORT_URL)}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="text-sm font-semibold text-muted">Support</Text>
        </Pressable>
      </View>

      {/* Delete account. Set apart from Sign out on purpose — they are one tap
          from each other and only one of them is recoverable. */}
      <View className="mt-10 border-t border-line pt-6">
        <Pressable
          onPress={onDeleteAccount}
          disabled={deleting}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="h-12 flex-row items-center justify-center"
        >
          {deleting ? (
            <ActivityIndicator color={colors.muted} />
          ) : (
            <Text className="text-sm font-bold text-muted underline">
              Delete account
            </Text>
          )}
        </Pressable>
        <Text className="mt-1 text-center text-xs text-faint">
          Permanently removes your profile, saves, and visits.
        </Text>
      </View>
    </ScrollView>
  );
}
