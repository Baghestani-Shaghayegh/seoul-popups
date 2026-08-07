import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Admin-only reader/writer for the discovery queue.
//
// WHY THIS EXISTS: popup_candidates has RLS on with zero policies and
// candidate_queue revokes anon + authenticated (009). That is deliberate — a
// queue of unverified rows must never be readable by the app's users — but it
// left the queue with no reader at all, so publishing meant running SQL by
// hand. This is the one door into it, and it is locked to public.admins.
//
// SECURITY. Two clients on purpose:
//   - `caller` is built from the request's own Authorization header and is used
//     ONLY to resolve who is asking. It has the user's rights, nothing more.
//   - `admin` uses the service role and is only ever reached after the caller
//     has been found in public.admins.
// Never merge them. Reading the queue with the caller's token would return
// nothing (RLS), and using the service role before the check would hand the
// whole queue to any signed-in user.
//
// verify_jwt is on, so an unauthenticated request never reaches this code — but
// that only proves a valid JWT, not that its owner is an admin, which is why
// the admins lookup below is not redundant.

// The triage screen runs on Expo web as well as the device, so the browser
// sends a preflight. Without these the whole screen fails with a CORS error and
// no amount of correct auth helps. Mirrors instagram-reels.
// Triage defaults to the Naver queue. The newsroom candidates are still there
// and still enriched — they are simply not what is being worked through right
// now, and a queue you scroll past is a queue you stop opening. Pass
// { source: 'all' } to see everything, or another display_name to narrow.
const NAVER_SOURCE = 'NAVER 지역 검색';

// 지역 returns the venue's own channel, which is an Instagram post for about
// two thirds of rows and a brand website for the rest. The website ones are
// weaker candidates: the link usually lands on a homepage rather than the
// pop-up, so there is no date to read and the page title is the shop's, not the
// event's. Default to the Instagram-linked ones and pass { link_like: 'all' }
// to see the rest.
const LINK_LIKE = '%instagram.com%';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  action?: 'list' | 'reject' | 'publish';
  /** Source display_name to show, or 'all'. Defaults to NAVER_SOURCE. */
  source?: string;
  /** SQL ilike pattern the candidate url must match, or 'all'. */
  link_like?: string;
  id?: string;
  reason?: string;
  name?: string;
  tagline?: string;
  description?: string;
  category?: string;
  start_date?: string | null;
  end_date?: string | null;
  image_url?: string | null;
}

Deno.serve(async (req: Request) => {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  // Preflight carries no Authorization header by design, so it must be answered
  // before any auth check or the browser never sends the real request.
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

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

  const admin = createClient(
    url,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: isAdmin } = await admin
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  // Same 403 whether the row is missing or the caller guessed an id — this
  // endpoint should not confirm who is an admin.
  if (!isAdmin) return json({ error: 'not_admin' }, 403);

  let body: Body = {};
  if (req.method === 'POST') {
    try {
      body = (await req.json()) as Body;
    } catch {
      return json({ error: 'bad_json' }, 400);
    }
  }
  const action = body.action ?? 'list';

  if (action === 'list') {
    const source = body.source ?? NAVER_SOURCE;
    const linkLike = body.link_like ?? LINK_LIKE;
    let q = admin.from('triage_queue').select('*').limit(200);
    if (source !== 'all') q = q.eq('source', source);
    if (linkLike !== 'all') q = q.ilike('url', linkLike);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);
    return json({ candidates: data ?? [], source, link_like: linkLike });
  }

  if (!body.id) return json({ error: 'id_required' }, 400);

  if (action === 'reject') {
    const { error } = await admin
      .from('popup_candidates')
      .update({
        status: 'rejected',
        rejected_reason: (body.reason ?? 'rejected at triage').slice(0, 300),
      })
      .eq('id', body.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === 'publish') {
    // A photo typed at triage is stored on the CANDIDATE first, not passed to
    // draft-candidate, because draft_from_candidate() reads og_image_url off
    // the candidate row. Writing it here means the pasted URL goes through the
    // exact same path as a discovered one: the aggregator denylist, the https
    // check, and the mirror into popup-images. A URL that skipped that would
    // leave the published row hot-linking someone else's server, which is what
    // migration 010 exists to prevent.
    if (typeof body.image_url === 'string' && body.image_url.trim()) {
      const { error: imgErr } = await admin
        .from('popup_candidates')
        .update({ og_image_url: body.image_url.trim() })
        .eq('id', body.id);
      if (imgErr) return json({ error: imgErr.message }, 500);
    }

    // draft-candidate owns every guard that matters — Seoul bounds, venue
    // completeness, date sanity, image mirroring, idempotency. Forwarding to it
    // rather than reimplementing means triage cannot drift from those rules.
    const res = await fetch(`${url}/functions/v1/draft-candidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      },
      body: JSON.stringify({
        candidate_id: body.id,
        name: body.name,
        tagline: body.tagline,
        description: body.description,
        category: body.category,
        start_date: body.start_date,
        end_date: body.end_date,
      }),
    });
    const out = await res.json().catch(() => ({ error: 'draft_unreadable' }));
    return json(out, res.status);
  }

  return json({ error: 'unknown_action' }, 400);
});
