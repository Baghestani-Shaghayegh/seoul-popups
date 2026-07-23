# `notify-ending-soon` Edge Function

Sends an Expo push to the owner of every **saved** popup ending within 3 days.
Deployed already; it reads saves + tokens with the service role via the
`ending_soon_push_targets(within_days)` SQL function (migration 007) and posts
to Expo's push API. Returns `{ targets, sent }`.

Push requires **sign-in** (the server needs to know your saves) and a **physical
device** (Expo push tokens aren't issued on simulators/web). Users opt in from
the Saved tab → "Turn on ending-soon alerts", which stores their token in
`public.push_tokens`.

## Schedule it (once)

Run it daily. Easiest: **Supabase Dashboard → Edge Functions → notify-ending-soon
→ Schedules → add** a cron like `0 9 * * *` (09:00 UTC daily).

Or with pg_cron + pg_net in SQL:

```sql
select cron.schedule(
  'notify-ending-soon-daily',
  '0 9 * * *',
  $$ select net.http_post(
       url := 'https://xkykpcjbnlihreikqonu.functions.supabase.co/notify-ending-soon',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.service_role_key', true))
     ); $$
);
```

## Test manually

```sh
curl -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/notify-ending-soon" \
  -H "Authorization: Bearer <anon-or-service-key>"
```

Returns `{ "targets": 0, "sent": 0 }` until at least one signed-in user has
registered a device token and saved a popup ending within 3 days.

## Later

- Dedup: it can re-notify daily as a popup counts down. Add a "sent" log if you
  want at-most-once per popup instead.
- Prune tokens Expo reports as `DeviceNotRegistered` from `push_tokens`.
