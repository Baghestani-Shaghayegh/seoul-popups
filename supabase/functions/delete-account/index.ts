import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Deletes the CALLER'S OWN account, permanently.
//
// WHY THIS EXISTS: App Store Guideline 5.1.1(v) — an app that lets you create
// an account must let you delete it from inside the app. Support-email-only is
// an explicit rejection. It cannot be done client-side either: removing a row
// from auth.users needs the service role, which must never ship in the bundle.
//
// SECURITY. Two clients, same posture as triage/index.ts:
//   - `caller` carries the request's own Authorization header and is used ONLY
//     to answer "who is asking". It has the user's rights, nothing more.
//   - `admin` uses the service role and is reached only after that answer.
// The id being deleted is ALWAYS `user.id` resolved from the token — it is
// never read from the body. That is what makes this endpoint safe to expose:
// there is no input that could point it at somebody else's account. Do not add
// a `user_id` parameter, however convenient it looks for admin tooling.
//
// WHAT CASCADES AND WHAT DOES NOT. Every user-owned TABLE declares
// `references auth.users (id) on delete cascade` — user_saves + user_visits
// (006), push_tokens (007), notifications (019), profiles (017), admins (022) —
// so removing the auth row empties them in one statement. storage.objects has
// no such foreign key, so the avatar is orphaned instead of deleted: it must be
// removed here, first, or a public-read file of someone's face outlives the
// account that owns it. Same reasoning as purge-orphan-images.

const AVATARS = 'avatars';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  // Preflight carries no Authorization header by design, so it must be answered
  // before any auth check or the browser never sends the real request.
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'no_auth' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await caller.auth.getUser();
  if (!user) return json({ error: 'not_signed_in' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Avatars live at `<uid>/<file>` (018). List that folder and remove whatever
  // is in it — usually one file, but a replaced photo can leave more than one.
  const { data: files, error: listErr } = await admin.storage
    .from(AVATARS)
    .list(user.id, { limit: 100 });
  if (listErr) return json({ error: listErr.message }, 500);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    const { error: rmErr } = await admin.storage.from(AVATARS).remove(paths);
    // Fail loudly rather than deleting the account and leaving the photo. The
    // user can retry; a silent orphan is unfixable from the app side once the
    // account that names it is gone.
    if (rmErr) return json({ error: rmErr.message }, 500);
  }

  // The cascade does the rest.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json({ error: delErr.message }, 500);

  return json({ ok: true });
});
