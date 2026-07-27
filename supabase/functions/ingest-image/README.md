# `ingest-image` Edge Function

Re-hosts popup photos into our own `popup-images` bucket so the app never
hot-links someone else's CDN (CONTENT.md §4).

## Why this exists

Every popup seeded before 2026-07-27 pointed `image_url` at an aggregator's
CDN (`cdn.popga.co.kr`, dayforyou's CloudFront, `storage.heypop.kr`). Those
URLs are rotated and expire, so cards break silently; it also serves traffic
off a competitor's bandwidth and uses their image rather than the brand's.
This function walks the catalogue and mirrors anything not already in our
bucket, then rewrites the row to the permanent public URL.

## How to use it

It takes **no input**. Call it and it fixes whatever needs fixing:

```sh
curl -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/ingest-image" \
  -H "Authorization: Bearer <anon-key>"
```

Returns `{ checked, migrated, migratedNames, skipped }`. Re-running is
idempotent — rows already in the bucket are skipped, so a repeat call is a
no-op.

**To change which photo a popup uses:** update `image_url` on the row to the
brand's official photo (dashboard / service role — admin only), then call this
to mirror it into the bucket. Files land at `popup-images/<popup-id>.<ext>`
and overwrite on re-run, so pointing a row at a better photo and re-calling
replaces the old one.

## Why it takes no parameters

Deliberate. If it accepted `{popupId, sourceUrl}` then anyone holding the
**anon key — which ships inside the app** — could point it at an arbitrary
host (SSRF) or swap any popup's photo for something else. Because it only ever
re-fetches URLs already stored in the `popups` table, and only admins can
write that table, there is no caller-controlled input to abuse. `verify_jwt`
is on as well, so a valid key is still required.

Other guards: https-only source URLs, an allowlist of image content-types
(jpeg/png/webp/gif/avif), and a 5 MB cap matching the bucket's own limit.

## Note on placeholders

Mirroring copies whatever the row points at — including a placeholder. Once
mirrored, the URL is ours, so `npm run validate:popup`'s "Unsplash
placeholder" warning no longer fires for that row. Swap in the real photo
before publishing a draft; the validator can't catch it for you after a
mirror.
