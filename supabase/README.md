# Supabase setup

Everything server-side lives here as reviewable SQL (SECURITY.md §2 — schema
and policies are repo files, not dashboard-only state). One-time setup below;
day-to-day content entry is in [CONTENT.md](../CONTENT.md).

## 1. One-time project setup

1. Create a free project at <https://supabase.com> (any region; Seoul/Tokyo
   is closest to users).
2. **SQL Editor → New query** → paste all of [`schema.sql`](schema.sql) →
   Run. This creates the `popups` table with row-level security already on.
3. **Storage → New bucket** → name it `popup-images`, toggle **Public
   bucket** ON. Upload photos here (dashboard drag-and-drop) and use each
   file's public URL as `image_url`. Public means public-READ; uploads still
   require the dashboard.
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

## 3. Schema changes later

Add a numbered migration file per change (`002-add-<thing>.sql`, …) instead
of editing `schema.sql`, so the history of what ran against production stays
readable. Apply new files the same way (SQL Editor), and re-run the §2 tests
whenever a policy changes.
