import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Instagram Reels proxy. The app never sees the Instagram token — it lives here
// as an Edge Function secret (SECURITY.md §1). We call the Instagram Graph API
// with it and return only the safe, public fields the Reel screen needs.
//
// Set the secret before this returns data:
//   supabase secrets set INSTAGRAM_ACCESS_TOKEN=<long-lived-token>
// See ./README.md for the full Meta setup. Until it's set, this responds
// { configured: false } and the app shows a "coming soon" state.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const FIELDS =
  'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const LIMIT = 15;

interface IgMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

/** Map a raw Instagram media object to the app's Reel shape. */
function toReel(m: IgMedia) {
  return {
    id: m.id,
    caption: m.caption ?? '',
    mediaType: m.media_type,
    // Videos expose a still in thumbnail_url; images in media_url.
    imageUrl: m.thumbnail_url ?? m.media_url ?? null,
    permalink: m.permalink,
    timestamp: m.timestamp,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  const token = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
  if (!token) return json({ configured: false, reels: [] });

  try {
    const url =
      `https://graph.instagram.com/me/media?fields=${FIELDS}` +
      `&limit=${LIMIT}&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) {
      // Don't echo the response body — it can contain request context.
      return json(
        { configured: true, reels: [], error: `instagram_api_${res.status}` },
        502,
      );
    }
    const data = await res.json();
    const reels = Array.isArray(data.data) ? data.data.map(toReel) : [];
    return json({ configured: true, reels });
  } catch {
    return json({ configured: true, reels: [], error: 'fetch_failed' }, 500);
  }
});
