import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Sends an Expo push to the owner of every saved popup ending within N days.
// Run it on a schedule (see ./README.md). Uses the service role so it can read
// all users' saves + tokens; invoke it with the service-role key or a cron.

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

interface Target {
  user_id: string;
  popup_id: string;
  token: string;
  popup_name: string;
  end_date: string;
}

const title = 'Ending soon 👀';
const bodyFor = (name: string) =>
  `${name} wraps up soon — catch it before it's gone.`;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase.rpc('ending_soon_push_targets', {
    within_days: 3,
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const targets = (data ?? []) as Target[];

  // Record before sending. A push is gone the moment it is dismissed, so the
  // row is what the in-app inbox reads; writing it first means a delivery
  // failure still leaves the user something to find. The unique index on
  // (user_id, popup_id, kind) makes repeat runs a no-op rather than a flood,
  // so `stored` counts genuinely NEW notifications.
  let stored = 0;
  if (targets.length) {
    const { data: inserted, error: insertErr } = await supabase
      .from('notifications')
      .upsert(
        targets.map((t) => ({
          user_id: t.user_id,
          popup_id: t.popup_id,
          kind: 'ending_soon',
          title,
          body: bodyFor(t.popup_name),
        })),
        { onConflict: 'user_id,popup_id,kind', ignoreDuplicates: true },
      )
      .select('id');
    if (insertErr) {
      return json({ error: `storing notifications: ${insertErr.message}` }, 500);
    }
    stored = inserted?.length ?? 0;
  }

  const messages = targets.map((t) => ({
    to: t.token,
    title,
    body: bodyFor(t.popup_name),
    sound: 'default',
  }));

  let sent = 0;
  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += batch.length;
  }

  return json({ targets: targets.length, stored, sent });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
