import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_KEY = 'profile:v1';

interface ProfileValue {
  displayName: string | null;
  avatarUrl: string | null;
  /** What the greeting shows: chosen name → email local part → "there". */
  greetingName: string;
  /** True until the first load settles, so the header doesn't flash. */
  loading: boolean;
  setDisplayName: (name: string) => Promise<{ error: string | null }>;
  setAvatarUrl: (url: string | null) => Promise<{ error: string | null }>;
}

function parseLocal(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { displayName?: unknown };
    return typeof v.displayName === 'string' && v.displayName.trim()
      ? v.displayName
      : null;
  } catch {
    return null;
  }
}

const ProfileContext = createContext<ProfileValue | null>(null);

/**
 * The signed-in user's display name and avatar.
 *
 * Follows the shape of `useSyncedIdSet` — a `userId`-keyed effect with an
 * `active` cleanup flag, local storage for guests, and optimistic state — but
 * differs in four ways that matter:
 *
 * 1. `maybeSingle()`, never `single()`: `single()` throws PGRST116 when the row
 *    is missing, which is exactly the case we need to survive.
 * 2. `upsert`, not `update`: if the `handle_new_user` trigger ever swallowed an
 *    error (it is written to never raise), the first edit repairs the row.
 * 3. Writes are awaited and return `{ error }`. A heart tap can lose a write
 *    invisibly; a Save button owes the user a yes or a reason.
 * 4. A real `loading` flag. An empty id set renders like "not loaded yet"; a
 *    null name does not, and without this the header flashes "Hi there" before
 *    "Hi, sara yoon" on every cold start.
 *
 * Guests may set a nickname locally. On sign-in it is adopted ONLY if the
 * account has no name yet — a Google name came from an explicit OAuth consent,
 * a guest nickname was typed before an account existed, so overwriting the
 * former with the latter is the worse mistake. Either way the local copy is
 * cleared, so the account becomes the single source of truth.
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const email = user?.email ?? null;

  const [displayName, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      // Guest (or Supabase not configured): local storage is the source, and
      // there is no avatar — there is no anon write path to storage.
      if (!userId || !isSupabaseConfigured) {
        const local = parseLocal(await AsyncStorage.getItem(STORAGE_KEY));
        if (!active) return;
        setName(local);
        setAvatar(null);
        setLoading(false);
        return;
      }

      const supabase = getSupabase();
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      let name =
        (data as { display_name: string | null } | null)?.display_name ?? null;
      const avatar =
        (data as { avatar_url: string | null } | null)?.avatar_url ?? null;

      // Merge-up: only fill a gap, never overwrite a name the account already
      // has. See the precedence rule in the docstring.
      //
      // The local copy is dropped ONLY once it is safely superseded — either
      // the upsert succeeded, or the account already had a name so the guest
      // nickname was never going to win. Deleting it after a FAILED upsert
      // (offline, RLS, transient 5xx) loses it from device and server both,
      // which is the trap useSyncedIdSet avoids with the same guard.
      const local = parseLocal(await AsyncStorage.getItem(STORAGE_KEY));
      if (local) {
        if (!name?.trim()) {
          const { error } = await supabase
            .from('profiles')
            .upsert({ id: userId, display_name: local }, { onConflict: 'id' });
          if (!error) {
            name = local;
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }

      if (!active) return;
      setName(name);
      setAvatar(avatar);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const setDisplayName = useCallback(
    async (next: string) => {
      const name = next.trim();
      if (!name) return { error: 'Please enter a name.' };
      if (name.length > 40)
        return { error: 'Names are limited to 40 characters.' };
      // Optimistic, but reverted below if the write fails — otherwise the
      // header shows the new name while the screen shows an error saying it
      // did not save, and it silently snaps back on the next launch.
      const previous = displayName;
      setName(name);

      if (!userId || !isSupabaseConfigured) {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ displayName: name }),
        );
        return { error: null };
      }
      const { error } = await getSupabase()
        .from('profiles')
        .upsert({ id: userId, display_name: name }, { onConflict: 'id' });
      if (error) {
        setName(previous);
        return { error: error.message };
      }
      return { error: null };
    },
    [userId, displayName],
  );

  const setAvatarUrl = useCallback(
    async (url: string | null) => {
      if (!userId || !isSupabaseConfigured) {
        return { error: 'Sign in to set a photo.' };
      }
      const previous = avatarUrl;
      setAvatar(url);
      const { error } = await getSupabase()
        .from('profiles')
        .upsert({ id: userId, avatar_url: url }, { onConflict: 'id' });
      if (error) {
        setAvatar(previous);
        return { error: error.message };
      }
      return { error: null };
    },
    [userId, avatarUrl],
  );

  const value = useMemo<ProfileValue>(() => {
    const fallback = email ? email.split('@')[0] : null;
    return {
      displayName,
      avatarUrl,
      greetingName: displayName?.trim() || fallback || 'there',
      loading,
      setDisplayName,
      setAvatarUrl,
    };
  }, [displayName, avatarUrl, email, loading, setDisplayName, setAvatarUrl]);

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
