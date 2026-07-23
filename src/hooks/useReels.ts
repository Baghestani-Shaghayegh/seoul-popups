import { useCallback, useEffect, useState } from 'react';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export interface Reel {
  id: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  /** Still image (video thumbnail or photo). Null if Instagram omitted it. */
  imageUrl: string | null;
  permalink: string;
  timestamp: string;
}

interface UseReelsResult {
  reels: Reel[];
  loading: boolean;
  error: string | null;
  /** false until the Instagram token secret is set on the Edge Function. */
  configured: boolean;
  reload: () => void;
}

/**
 * Loads @mgn.radar reels from the `instagram-reels` Edge Function, which holds
 * the Instagram token server-side and returns only safe public fields. Until
 * the token secret is set the function replies `configured: false` and the Reel
 * screen shows a "coming soon" state.
 */
export function useReels(): UseReelsResult {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setConfigured(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getSupabase()
      .functions.invoke('instagram-reels')
      .then(({ data, error: fnError }) => {
        if (!active) return;
        if (fnError) throw fnError;
        setConfigured(Boolean(data?.configured));
        setReels(Array.isArray(data?.reels) ? (data.reels as Reel[]) : []);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load reels');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [nonce]);

  return { reels, loading, error, configured, reload };
}
