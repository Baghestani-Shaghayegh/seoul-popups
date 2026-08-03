import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Deletes files in `popup-images` that no popup row points at.
//
// Why it exists: Postgres blocks direct deletes from storage.objects, so
// removing files needs the Storage API and therefore the service role. The
// immediate job was clearing the 12 photos mirrored from aggregator CDNs
// (cdn.popga.co.kr, popply's CloudFront, storage.heypop.kr) — an unreferenced
// copy still sitting in a public-read bucket is still a copy we are publishing.
//
// SECURITY: takes no caller input, and is safe by construction rather than by
// permission — it can only ever delete an object that NO row references, so a
// live photo cannot be destroyed by calling this, however often or by whom.
// Same posture as ingest-image and scan-sources.

const BUCKET = 'popup-images';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: rows, error: rowsErr } = await supabase
    .from('popups')
    .select('image_url');
  if (rowsErr) {
    return json({ error: rowsErr.message }, 500);
  }

  // Referenced = the trailing path segment of any non-null image_url that
  // points into our bucket.
  const referenced = new Set<string>();
  for (const r of rows ?? []) {
    const u = (r as { image_url: string | null }).image_url;
    if (!u) continue;
    const marker = `/${BUCKET}/`;
    const i = u.indexOf(marker);
    if (i >= 0) referenced.add(u.slice(i + marker.length).split('?')[0]);
  }

  const { data: files, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 1000 });
  if (listErr) {
    return json({ error: listErr.message }, 500);
  }

  const orphans = (files ?? [])
    .map((f) => f.name)
    .filter((n) => n && !referenced.has(n));

  if (orphans.length === 0) {
    return json({ referenced: referenced.size, orphans: 0, deleted: [] });
  }

  const { error: delErr } = await supabase.storage.from(BUCKET).remove(orphans);
  if (delErr) {
    return json({ error: delErr.message, orphans }, 500);
  }

  return json({
    referenced: referenced.size,
    orphans: orphans.length,
    deleted: orphans,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
