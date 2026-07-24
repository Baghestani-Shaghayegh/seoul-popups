import { useEffect, useState } from 'react';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { decodePolyline, type LatLng } from '@/lib/polyline';
import type { RouteStop } from '@/lib/route';

interface Leg {
  distanceMeters: number;
  durationSeconds: number;
}

interface LiveRoute {
  key: string;
  stops: RouteStop[];
  polyline: LatLng[] | null;
}

interface UseWalkingRouteResult {
  /** The input stops, with real distances/times merged in when available. */
  stops: RouteStop[];
  /** Decoded path to draw on the map. Null until (if ever) real data loads. */
  polyline: LatLng[] | null;
  loading: boolean;
  /** True once the stops reflect real routing data, not straight-line estimates. */
  live: boolean;
}

/**
 * Enhances an already-ordered route (from buildRoute — straight-line estimates,
 * works offline) with real walking distances/times and a road-following polyline
 * from the `walking-directions` Edge Function. Silently keeps the straight-line
 * estimates if the routing key isn't configured or the request fails.
 *
 * `stops` is *derived* on every render (input if no matching live data yet,
 * else the live version) rather than mirrored into its own state — mirroring
 * via an effect left one render where the mirrored state hadn't caught up yet
 * (input non-empty, mirrored stops still []), which crashed callers indexing
 * stops[0]. Deriving means there's never a render where stops don't match input.
 */
export function useWalkingRoute(input: RouteStop[]): UseWalkingRouteResult {
  const [live, setLive] = useState<LiveRoute | null>(null);
  const [loading, setLoading] = useState(false);

  const routeKey = input.map((s) => s.popup.id).join(',');

  useEffect(() => {
    setLoading(false);
    if (!isSupabaseConfigured || input.length < 2) return;

    let active = true;
    setLoading(true);
    getSupabase()
      .functions.invoke('walking-directions', {
        body: {
          stops: input.map((s) => ({
            lat: s.popup.latitude,
            lng: s.popup.longitude,
          })),
        },
      })
      .then(({ data, error }) => {
        if (!active || error || !data?.configured || !data.legs) return;
        const legs = data.legs as Leg[];
        if (legs.length !== input.length - 1) return; // sanity check
        const stops = input.map((s, i) => {
          if (i === 0) return s;
          const leg = legs[i - 1];
          return {
            ...s,
            walkFromPrevMeters: leg.distanceMeters,
            walkFromPrevMin: Math.max(1, Math.round(leg.durationSeconds / 60)),
          };
        });
        setLive({
          key: routeKey,
          stops,
          polyline: data.polyline ? decodePolyline(data.polyline) : null,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const isLive = live?.key === routeKey;
  return {
    stops: isLive ? live.stops : input,
    polyline: isLive ? live.polyline : null,
    loading,
    live: isLive,
  };
}
