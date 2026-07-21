# Supabase setup

Everything server-side lives here as reviewable SQL (SECURITY.md §2 — schema
and policies are repo files, not dashboard-only state). One-time setup below;
day-to-day content entry is in [CONTENT.md](../CONTENT.md).

## 1. One-time project setup

1. Create a free project at <https://supabase.com> (any region; Seoul/Tokyo
   is closest to users).
2. **SQL Editor → New query** → paste all of [`schema.sql`](schema.sql) →
   Run. This creates the `popups` table with row-level security already on.
3. **Storage bucket** → run [`004-popup-images-bucket.sql`](004-popup-images-bucket.sql)
   in the SQL Editor (same as the other migrations). It creates the
   `popup-images` bucket: public-READ, image MIME types only, 5 MB/file, and
   **no** upload policy — so writes go only through the dashboard drag-and-drop
   / service role (SECURITY.md §1). Upload photos there and use each file's
   public URL as `image_url`.
4. **Project Settings → API**: copy the Project URL and the `anon` `public`
   key into `.env` (copy `.env.example` → `.env`). These two values are safe
   to ship in the app.
   **Never** copy the `service_role` key anywhere in this repo
   (SECURITY.md §1).

## 2. Test the policies from the outside (required)

Per SECURITY.md §2, prove the rules with only the anon key, as an attacker
would. Replace `<PROJECT_REF>` and `<ANON_KEY>`:

Read — should return `[]` (or rows) with HTTP 200:

```sh
curl "https://<PROJECT_REF>.supabase.co/rest/v1/popups?select=name" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Write — MUST fail (401/403, "row-level security" in the message):

```sh
curl -X POST "https://<PROJECT_REF>.supabase.co/rest/v1/popups" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"name":"should-be-blocked"}'
```

If the write succeeds, stop and fix the policies before entering real data.

Note: after migration `003`, the read test returns only **published** rows
(the app never sees drafts). A brand-new project with no published rows
returns `[]` — still HTTP 200, still correct.

## 3. Review gate + freshness (migration 003)

`003-trust-and-freshness.sql` makes the catalogue trustworthy and self-cleaning:

- **`published`** — rows are drafts (`false`) until a human publishes them. RLS
  exposes only `published = true` to the app / anon key, so unreviewed data can
  never leak into production. The dashboard (service role) sees everything.
- **`last_verified_at`, `source_name`, `updated_at`** — provenance + freshness.
  `updated_at` auto-touches on every change (trigger).
- **`popups_needs_review`** — a maintenance view (dashboard-only) listing rows
  that are `ended`, `ending_soon`, or `stale`. See CONTENT.md §3.6.

The full add → validate → publish loop is CONTENT.md §3.5. Validate a drafted
row before publishing with `npm run validate:popup <file.json>`.

## 4. Schema changes later

Add a numbered migration file per change (`005-add-<thing>.sql`, …) instead
of editing `schema.sql`, so the history of what ran against production stays
readable. Apply new files the same way (SQL Editor), and re-run the §2 tests
whenever a policy changes.
