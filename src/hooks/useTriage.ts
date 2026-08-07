import { useCallback, useEffect, useState } from 'react';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * One row of the discovery queue, as the `triage` Edge Function returns it.
 *
 * Mirrors public.triage_queue (022). The `detected_*` fields are Naver's
 * answers and are HINTS — 021 is explicit that a human promotes them, so this
 * type keeps them separate from `extracted_*`, which only ever comes from the
 * source page itself.
 */
export interface TriageCandidate {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  score: number;
  source: string;
  tier: number;
  detected_category: string | null;
  detected_neighborhood: string | null;
  detected_address: string | null;
  detected_latitude: number | null;
  detected_longitude: number | null;
  detected_dates: string[];
  extracted_start: string | null;
  extracted_end: string | null;
  date_evidence: string | null;
  extract_notes: string[] | null;
  og_image_url: string | null;
  venue_name: string | null;
}

export interface PublishInput {
  name: string;
  tagline: string;
  description: string;
  category: string;
  start_date: string | null;
  end_date: string | null;
  image_url?: string | null;
}

/**
 * The queue is RLS-closed with zero policies (009), so it cannot be read with
 * `supabase.from(...)` at all — every call here goes through the `triage`
 * function, which checks public.admins before touching the service role.
 *
 * A non-admin gets 403 and sees the empty state, which is the correct outcome:
 * the screen is unlisted rather than hidden behind a role check in the UI.
 */
export function useTriage() {
  const [candidates, setCandidates] = useState<TriageCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    const { data, error: err } = await getSupabase().functions.invoke('triage', {
      body,
    });
    if (err) {
      // supabase-js throws FunctionsHttpError on ANY non-2xx and leaves `data`
      // null, so the function's own {error: ...} body is only reachable through
      // the Response it attaches. Without this every failure — including the
      // expected not_signed_in / not_admin — reads "Edge Function returned a
      // non-2xx status code", which tells the reader nothing.
      const ctx = (err as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = (await ctx.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (body?.error) throw new Error(body.error);
      }
      throw err;
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoke({ action: 'list' });
      setCandidates(data.candidates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the queue');
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Drop the row locally so the card leaves the list without a full reload. */
  const forget = useCallback((id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reject = useCallback(
    async (id: string, reason?: string) => {
      await invoke({ action: 'reject', id, reason });
      forget(id);
    },
    [invoke, forget],
  );

  const publish = useCallback(
    async (id: string, input: PublishInput) => {
      const out = await invoke({ action: 'publish', id, ...input });
      forget(id);
      return out;
    },
    [invoke, forget],
  );

  return { candidates, loading, error, refresh, reject, publish };
}
