import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Turns a reviewed candidate into a draft pop-up AND takes ownership of its
// photo in one call.
//
// Why this exists: draft_from_candidate() is SQL and cannot make HTTP calls, so
// it could only copy the candidate's og:image URL — a hot-link to the venue's
// CDN — into popups.image_url. Closing that needed a separate ingest-image run,
// which meant either a second scheduled job or a step to remember. Both leave a
// window where a published row hot-links someone else's server, which is
// exactly what migration 010 and the aggregator denylist exist to prevent.
//
// Mirroring happens HERE rather than during enrichment on purpose: at enrich
// time a candidate is a maybe, and most get rejected. Downloading every one
// would store third-party images for content we never publish. This is the
// moment we have decided to use the photo.
//
// SECURITY: unlike the other functions this takes caller input, but a caller
// needs a valid candidate UUID and popup_candidates is RLS-closed to the anon
// key, so ids are not discoverable. Rows are created with published = false and
// so are invisible to the app regardless. All the SQL guards still apply
// (idempotency, venue completeness, Seoul bounds, dates).

const BUCKET = 'popup-images';
const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** Same list ingest-image refuses. A venue's own asset is fine; a competitor's
 *  crop of a brand's photo is not, however it reached us. */
const DENIED_HOST =
  /(^|\.)(popply|popga|dayforyou|heypop|aniway|insideseoul)\.[a-z.]+$|d8nffddmkwqeq\.cloudfront\.net$/i;

interface Body {
  candidate_id?: string;
  name?: string;
  tagline?: string;
  description?: string;
  category?: string;
  start_date?: string | null;
  end_date?: string | null;
}

Deno.serve(async (req: Request) => {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b, null, 2), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'expected a JSON body' }, 400);
  }

  const { candidate_id, name, tagline, description, category } = body;
  if (!candidate_id || !name || !tagline || !description || !category) {
    return json(
      {
        error:
          'candidate_id, name, tagline, description and category are all required',
      },
      400,
    );
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(
    url,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1. Create the draft. Every guard lives in the SQL function so both entry
  //    points enforce the same rules.
  const { data: popupId, error: rpcErr } = await supabase.rpc(
    'draft_from_candidate',
    {
      p_candidate: candidate_id,
      p_name: name,
      p_tagline: tagline,
      p_description: description,
      p_category: category,
      p_start: body.start_date ?? null,
      p_end: body.end_date ?? null,
    },
  );
  if (rpcErr) return json({ error: rpcErr.message }, 400);

  // 2. Take ownership of the photo immediately, so the row never sits
  //    hot-linking the source. A failure here is reported but does NOT undo the
  //    draft — the row is valid without a photo (it renders the house card).
  const result: Record<string, unknown> = { popup_id: popupId, image: 'none' };

  const { data: row } = await supabase
    .from('popups')
    .select('image_url')
    .eq('id', popupId)
    .single();
  const src = (row as { image_url: string | null } | null)?.image_url ?? null;

  if (src && !src.includes(`/${BUCKET}/`)) {
    try {
      const host = new URL(src).hostname;
      if (!src.startsWith('https://')) {
        result.image = 'skipped: source is not https';
      } else if (DENIED_HOST.test(host)) {
        await supabase
          .from('popups')
          .update({ image_url: null })
          .eq('id', popupId);
        result.image = `refused aggregator host ${host} — using house card`;
      } else {
        const res = await fetch(src, {
          redirect: 'follow',
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        const type = (res.headers.get('content-type') ?? '')
          .split(';')[0]
          .trim()
          .toLowerCase();
        const ext = EXT[type];
        if (!res.ok) {
          result.image = `source returned ${res.status}`;
        } else if (!ext) {
          result.image = `unsupported type ${type}`;
        } else {
          const bytes = new Uint8Array(await res.arrayBuffer());
          if (bytes.byteLength > MAX_BYTES) {
            result.image = 'larger than 5 MB';
          } else {
            const path = `${popupId}.${ext}`;
            const up = await supabase.storage
              .from(BUCKET)
              .upload(path, bytes, { contentType: type, upsert: true });
            if (up.error) {
              result.image = `upload failed: ${up.error.message}`;
            } else {
              const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${path}`;
              const { error: patchErr } = await supabase
                .from('popups')
                .update({ image_url: publicUrl })
                .eq('id', popupId);
              result.image = patchErr
                ? `stored but row update failed: ${patchErr.message}`
                : 'mirrored';
              if (!patchErr) result.image_url = publicUrl;
            }
          }
        }
      }
    } catch (e) {
      result.image = `failed: ${e}`;
    }
  }

  // The draft is deliberately unpublished — a human still checks it.
  result.published = false;
  return json(result);
});
