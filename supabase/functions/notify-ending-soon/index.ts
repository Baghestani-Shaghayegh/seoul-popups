import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Sends an Expo push to the owner of every saved popup ending within N days.
// Run it on a schedule (see ./README.md). Uses the service role so it can read
// all users' saves + tokens; invoke it with the service-role key or a cron.

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

interface Target {
  token: string;
  popup_name: string;
  end_date: string;
}

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
  const messages = targets.map((t) => ({
    to: t.token,
    title: 'Ending soon 👀',
    body: `${t.popup_name} wraps up soon — catch it before it's gone.`,
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

  return new Response(JSON.stringify({ targets: targets.length, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
