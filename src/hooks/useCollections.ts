import { useEffect, useState } from 'react';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export interface Collection {
  id: string;
  title: string;
  subtitle: string | null;
  emoji: string | null;
  /** Ordered popup ids; the UI resolves them against the popup cache and
   *  silently drops any that are no longer in the catalogue. */
  popupIds: string[];
  position: number;
}

interface CollectionRow {
  id: string;
  title: string;
  subtitle: string | null;
  emoji: string | null;
  popup_ids: string[] | null;
  position: number;
}

interface UseCollectionsResult {
  collections: Collection[];
  loading: boolean;
  error: string | null;
}

// Small set, fetched once and shared across the Home rail + detail screen.
let cache: Collection[] | null = null;

/** Loads published curated collections (ordered by `position`). */
export function useCollections(): UseCollectionsResult {
  const [state, setState] = useState<UseCollectionsResult>(() =>
    cache
      ? { collections: cache, loading: false, error: null }
      : { collections: [], loading: isSupabaseConfigured, error: null },
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ collections: [], loading: false, error: null });
      return;
    }
    if (cache) {
      setState({ collections: cache, loading: false, error: null });
      return;
    }
    let active = true;
    getSupabase()
      .from('collections')
      .select('id,title,subtitle,emoji,popup_ids,position')
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState({ collections: [], loading: false, error: error.message });
          return;
        }
        cache = (data as CollectionRow[]).map((r) => ({
          id: r.id,
          title: r.title,
          subtitle: r.subtitle,
          emoji: r.emoji,
          popupIds: r.popup_ids ?? [],
          position: r.position,
        }));
        setState({ collections: cache, loading: false, error: null });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
