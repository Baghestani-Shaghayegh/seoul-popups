-- Image provenance, so "whose photo is this?" is answerable in SQL.
--
-- Migration 010 made image_url nullable and every aggregator photo was purged,
-- because a NOT NULL column had forced 13 rows to carry someone else's crop.
-- The policy is now deliberately narrower than "never": a brand or venue photo
-- is preferred, and an aggregator photo is allowed ONLY as a stopgap on a
-- pop-up that would otherwise render the house card (CONTENT.md §4).
--
-- That distinction is worthless if it lives only in someone's memory, which is
-- exactly how the first 12 rows went wrong. So the column records it, and the
-- check constraint makes "a photo with no stated origin" unrepresentable —
-- the same schema-not-judgement fix as 010 and 008.
alter table public.popups
  add column if not exists image_source text
    check (image_source in ('brand', 'venue', 'own', 'aggregator'));

comment on column public.popups.image_source is
  'Where the photo came from. brand/venue/own are permanent and may be '
  'mirrored into popup-images. aggregator is a STOPGAP: hot-linked, never '
  'mirrored, and meant to be replaced by a brand photo. See CONTENT.md §4.';

-- A photo must declare its origin. Applies to the dashboard too, which is
-- where a well-meaning manual paste would otherwise reintroduce the problem.
alter table public.popups
  drop constraint if exists popups_image_has_source;
alter table public.popups
  add constraint popups_image_has_source
    check (image_url is null or image_source is not null);

-- Migration 010 banned aggregator links outright. Keep the guard but make it
-- conditional: an aggregator link is legal only where it is DECLARED as one.
-- An accidental paste (the original failure) still fails loudly; a deliberate
-- stopgap is possible and self-labelling.
alter table public.popups
  drop constraint if exists popups_image_url_not_aggregator;
alter table public.popups
  add constraint popups_image_url_not_aggregator
    check (not is_aggregator_link(image_url) or image_source = 'aggregator');

-- Find every stopgap that still needs a real photo.
create or replace view public.popups_needing_photo as
  select id, name, neighborhood, category, image_source, image_url
  from public.popups
  where image_url is null or image_source = 'aggregator';

comment on view public.popups_needing_photo is
  'Work queue: pop-ups showing the house card, plus those on a borrowed '
  'aggregator photo that should be swapped for a brand one.';
