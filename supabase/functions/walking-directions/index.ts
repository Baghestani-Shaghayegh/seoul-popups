import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Real walking directions for Plan my day v2. The app sends an ordered list of
// stop coordinates; this proxies to Google's Directions API (mode=walking) and
// returns per-hop distance/duration plus a single polyline for the whole route.
// The Google key stays server-side (SECURITY.md §1) — never shipped to the app.
//
// Set the secret before this returns real data:
//   supabase secrets set GOOGLE_DIRECTIONS_SERVER_KEY=<server-restricted-key>
// See ./README.md. Until it's set, responds { configured: false } and the app
// falls back to the straight-line estimates it already computes locally.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Stop {
  lat: number;
  lng: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  const key = Deno.env.get('GOOGLE_DIRECTIONS_SERVER_KEY');
  if (!key) return json({ configured: false });

  let stops: Stop[];
  try {
    const body = await req.json();
    stops = body?.stops;
    if (!Array.isArray(stops) || stops.length < 2) {
      return json({ configured: true, error: 'need_at_least_2_stops' }, 400);
    }
    // Directions API caps intermediate waypoints at 25.
    if (stops.length > 27) {
      return json({ configured: true, error: 'too_many_stops' }, 400);
    }
  } catch {
    return json({ configured: true, error: 'bad_request' }, 400);
  }

  const fmt = (s: Stop) => `${s.lat},${s.lng}`;
  const origin = fmt(stops[0]);
  const destination = fmt(stops[stops.length - 1]);
  const middle = stops.slice(1, -1).map(fmt).join('|');

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    if (middle) url.searchParams.set('waypoints', middle);
    url.searchParams.set('mode', 'walking');
    url.searchParams.set('key', key);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== 'OK' || !data.routes?.[0]) {
      // Don't leak the raw Google error (can echo request context) — just the status.
      return json(
        { configured: true, error: `directions_${data.status ?? 'failed'}` },
        502,
      );
    }

    const route = data.routes[0];
    const legs = route.legs.map(
      (leg: { distance: { value: number }; duration: { value: number } }) => ({
        distanceMeters: leg.distance.value,
        durationSeconds: leg.duration.value,
      }),
    );

    return json({
      configured: true,
      legs,
      polyline: route.overview_polyline?.points ?? null,
    });
  } catch {
    return json({ configured: true, error: 'fetch_failed' }, 500);
  }
});
