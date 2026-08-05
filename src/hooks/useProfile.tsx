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

const ProfileContext = createContext<ProfileValue | null>(null);

/**
 * The signed-in user's display name and avatar.
 *
 * Unlike `useSyncedIdSet`, which this otherwise resembles (a `userId`-keyed
 * effect with an `active` cleanup flag, optimistic state), there is NO guest
 * mode: a profile belongs to an account, and My Page is unreachable without
 * one. An earlier cut let guests keep a local nickname that was merged up on
 * sign-in; it was removed rather than left as a path nothing could reach.
 *
 * Four things it does differently that are worth keeping:
 *
 * 1. `maybeSingle()`, never `single()`: `single()` throws PGRST116 when the row
 *    is missing, which is exactly the case we need to survive.
 * 2. `upsert`, not `update`: if the `handle_new_user` trigger ever swallowed an
 *    error (it is written to never raise), the first edit repairs the row.
 * 3. Writes are awaited and return `{ error }`, and the optimistic value is
 *    rolled back when they fail. A heart tap can lose a write invisibly; a
 *    Save button owes the user a yes or a reason, and must not show the new
 *    name while reporting that it did not save.
 * 4. A real `loading` flag. An empty id set renders like "not loaded yet"; a
 *    null name does not, and without this the header flashes "Hi there" before
 *    "Hi, sara yoon" on every cold start.
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
      // Signed out: there is no profile to show. Clear rather than keep the
      // previous user's name on screen after a sign-out.
      if (!userId || !isSupabaseConfigured) {
        if (!active) return;
        setName(null);
        setAvatar(null);
        setLoading(false);
        return;
      }

      const { data } = await getSupabase()
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (!active) return;
      const row = data as {
        display_name: string | null;
        avatar_url: string | null;
      } | null;
      setName(row?.display_name ?? null);
      setAvatar(row?.avatar_url ?? null);
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
      if (!userId || !isSupabaseConfigured) {
        return { error: 'Sign in to set a name.' };
      }
      const previous = displayName;
      setName(name);

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
