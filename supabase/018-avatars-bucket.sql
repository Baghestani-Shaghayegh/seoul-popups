-- Avatars bucket — the first bucket in this project users may write to.
--
-- ⚠️ WHY THIS IS NOT `popup-images`: purge-orphan-images hardcodes
-- `const BUCKET = 'popup-images'` and deletes every object in it that no
-- popups.image_url references. An avatar stored there is an orphan by that
-- definition and would be deleted on the next run — silently, leaving a broken
-- image in the app. Do not "simplify" these into one bucket.
--
-- SECURITY.md §1 says writes go through the dashboard or the service role. This
-- is a deliberate exception: profile photos cannot work that way. It is made
-- safe by path, not by trust — every policy below requires the first folder
-- segment to equal the caller's own uid, so a user can only ever touch
-- `<their-own-uid>/…`. Public read matches popup-images (CDN, no select policy).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB; a cropped, quality-0.6 phone photo lands far under this
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users replace their own avatar" on storage.objects;
create policy "users replace their own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete their own avatar" on storage.objects;
create policy "users delete their own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
