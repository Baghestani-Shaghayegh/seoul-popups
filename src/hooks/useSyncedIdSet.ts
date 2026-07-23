import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export interface SyncedIdSet {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
}

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * A set of popup ids that persists locally for guests and to a per-user
 * Supabase table when signed in. On sign-in it merges the guest's local ids up
 * into the table (so nothing is lost), then clears the local copy so the
 * account becomes the single source of truth. Sign-out falls back to whatever
 * is left in local storage. Powers both favorites and "been there".
 */
export function useSyncedIdSet(storageKey: string, table: string): SyncedIdSet {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      // Guest (or Supabase not configured): local storage is the source.
      if (!userId || !isSupabaseConfigured) {
        const raw = await AsyncStorage.getItem(storageKey);
        if (active) setIds(parseIds(raw));
        return;
      }

      const supabase = getSupabase();
      // Merge any local guest ids up into the account, once.
      const local = parseIds(await AsyncStorage.getItem(storageKey));
      if (local.length) {
        const { error } = await supabase.from(table).upsert(
          local.map((popup_id) => ({ user_id: userId, popup_id })),
          { onConflict: 'user_id,popup_id', ignoreDuplicates: true },
        );
        if (!error) await AsyncStorage.removeItem(storageKey);
      }
      const { data } = await supabase
        .from(table)
        .select('popup_id')
        .eq('user_id', userId);
      if (active) {
        setIds((data ?? []).map((r) => (r as { popup_id: string }).popup_id));
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, storageKey, table]);

  const toggle = useCallback(
    (id: string) => {
      const has = ids.includes(id);
      const next = has ? ids.filter((x) => x !== id) : [...ids, id];
      setIds(next);

      if (userId && isSupabaseConfigured) {
        const supabase = getSupabase();
        if (has) {
          void supabase
            .from(table)
            .delete()
            .eq('user_id', userId)
            .eq('popup_id', id);
        } else {
          void supabase
            .from(table)
            .upsert(
              { user_id: userId, popup_id: id },
              { onConflict: 'user_id,popup_id', ignoreDuplicates: true },
            );
        }
      } else {
        void AsyncStorage.setItem(storageKey, JSON.stringify(next));
      }
    },
    [ids, userId, storageKey, table],
  );

  return useMemo(
    () => ({ ids, has: (id) => ids.includes(id), toggle }),
    [ids, toggle],
  );
}
