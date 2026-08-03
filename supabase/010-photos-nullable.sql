-- 010 — Photos: let a pop-up have none, and stop pointing at copied ones.
-- (applied 2026-08-03)
--
-- image_url was NOT NULL, which is *why* every row ended up with an
-- aggregator's photo: the schema demanded an image and the only ones to hand
-- belonged to competitors. Same failure as subway_exit in migration 008 — a
-- column that cannot say "we don't have this" gets filled with something wrong.
--
-- The app now renders a generated house card (src/components/popups/
-- PopupPlaceholder.tsx) when there is no photo: on-brand, always available,
-- owes nobody. Real photos go back in per pop-up as brand press kits or
-- permission arrive.
--
-- The mirrored FILES are removed separately — Postgres blocks direct deletes
-- from storage.objects ("Use the Storage API instead"). See the
-- purge-orphan-images Edge Function, which only ever deletes objects that no
-- popup row references, so it cannot destroy a live photo.

alter table public.popups alter column image_url drop not null;

update public.popups set image_url = null;
