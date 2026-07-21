-- 004 — Storage bucket for official popup photos.
--
-- Creates the `popup-images` bucket the app reads hero images from. Public =
-- public-READ only: objects are served over the CDN without a key, which is
-- what the app needs. Uploads are NOT granted to anon/authenticated — there is
-- no INSERT/UPDATE/DELETE policy on storage.objects for those roles, so writes
-- go only through the dashboard / service role (SECURITY.md §1). Guardrails:
-- image MIME types only, 5 MB per file.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'popup-images',
  'popup-images',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;
