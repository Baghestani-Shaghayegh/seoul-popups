# `walking-directions` Edge Function

Real walking distances/times + a road-following polyline for Plan my day v2.
Deployed already; the app already works without this — it falls back to the
straight-line estimates `buildRoute` computes locally (v1 behavior). Setting
the key upgrades every plan to live directions with no app update needed.

Input: `{ stops: [{ lat, lng }, ...] }` in the order the app already picked
(nearest-neighbor). Output: `{ configured, legs: [{ distanceMeters,
durationSeconds }], polyline }` — one leg per hop, `polyline` is a Google
encoded polyline string decoded client-side in `src/lib/polyline.ts`.

## Get a key

1. [Google Cloud Console](https://console.cloud.google.com) → the same
   project used for `GOOGLE_MAPS_ANDROID_KEY` (or a new one) → **APIs &
   Services → Library** → enable **Directions API**.
2. **Credentials → Create Credentials → API key.**
3. **Restrict it** (Edit API key):
   - **Application restrictions: None** — this key is called from the Edge
     Function (a server), not the app, so app-side restrictions (bundle
     ID / package name) don't apply. If you want extra safety, restrict by
     IP address once you know Supabase's egress IPs; otherwise the API
     restriction below is the real guardrail.
   - **API restrictions: Restrict key → Directions API only.**
4. Copy the key — this is the **server key**, different from
   `GOOGLE_MAPS_ANDROID_KEY` (that one draws the map tiles and is safe to ship
   in the Android build; this one must never leave the server).

## Set the secret

```sh
supabase secrets set GOOGLE_DIRECTIONS_SERVER_KEY=<your-key>
```

Or via the dashboard: **Edge Functions → Manage secrets**. Plan my day goes
live-routed on the next request — no redeploy needed.

## Cost

Directions API is pay-per-request beyond Google's free monthly credit
($200/mo covers roughly 40,000 Directions calls at time of writing — this app
makes one call per "Plan my route" tap, not per screen view). Fine for
development and early usage; revisit if usage grows.

## Test manually

```sh
curl -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/walking-directions" \
  -H "Authorization: Bearer <anon-key>" -H "Content-Type: application/json" \
  -d '{"stops":[{"lat":37.5445,"lng":127.0555},{"lat":37.5443,"lng":127.0559}]}'
```

Returns `{ "configured": false }` until the secret is set.
