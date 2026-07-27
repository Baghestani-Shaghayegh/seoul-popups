import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Mirrors popup photos into our own `popup-images` bucket.
//
// Why: CONTENT.md §4 forbids hot-linking other people's image URLs — they are
// signed/rotated and expire, so cards silently break, and we would be serving
// off someone else's CDN. This walks the catalogue and re-hosts anything not
// already in our bucket, then rewrites the row to the permanent public URL.
//
// SECURITY: this takes **no caller input at all** — no popup id, no source
// URL. It only ever re-hosts URLs that are already stored in the popups table,
// which only admins (dashboard / service role) can write. That removes the
// obvious abuse surface: a caller holding the shipped anon key cannot point it
// at an arbitrary host (SSRF) or overwrite a popup's photo. Re-running is
// idempotent — once a row is in the bucket it is skipped — so the worst a
// repeat call can do is nothing. To change WHICH photo a popup uses, update
// `image_url` on the row (admin-only), then call this to mirror it.
//
// Deployed with verify_jwt = true, so a valid key is still required.

const BUCKET = 'popup-images';
const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's own 5 MB limit

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

interface Row {
  id: string;
  name: string;
  image_url: string;
}

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(
    url,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const publicPrefix = `${url}/storage/v1/object/public/${BUCKET}/`;

  // Every row whose photo still lives on someone else's host.
  const { data, error } = await supabase
    .from('popups')
    .select('id, name, image_url')
    .not('image_url', 'like', `${publicPrefix}%`);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const rows = (data ?? []) as Row[];
  const migrated: string[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (const row of rows) {
    try {
      // Only ever fetch https — no http, no other schemes.
      if (!row.image_url?.startsWith('https://')) {
        skipped.push({ name: row.name, reason: 'image_url is not https' });
        continue;
      }

      const res = await fetch(row.image_url, { redirect: 'follow' });
      if (!res.ok) {
        skipped.push({ name: row.name, reason: `source returned ${res.status}` });
        continue;
      }

      const type = (res.headers.get('content-type') ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      const ext = EXT[type];
      if (!ext) {
        skipped.push({ name: row.name, reason: `unsupported type ${type}` });
        continue;
      }

      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_BYTES) {
        skipped.push({ name: row.name, reason: 'larger than 5 MB' });
        continue;
      }

      const path = `${row.id}.${ext}`;
      const up = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: type, upsert: true });
      if (up.error) {
        skipped.push({ name: row.name, reason: `upload: ${up.error.message}` });
        continue;
      }

      const publicUrl = `${publicPrefix}${path}`;
      const patch = await supabase
        .from('popups')
        .update({ image_url: publicUrl })
        .eq('id', row.id);
      if (patch.error) {
        skipped.push({ name: row.name, reason: `update: ${patch.error.message}` });
        continue;
      }

      migrated.push(row.name);
    } catch (e) {
      skipped.push({ name: row.name, reason: `failed: ${e}` });
    }
  }

  return json({
    checked: rows.length,
    migrated: migrated.length,
    migratedNames: migrated,
    skipped,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
