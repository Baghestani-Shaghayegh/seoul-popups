-- A hand-picked hero for the Home screen.
--
-- "Feature" was the biggest card on the page and nothing chose it: the client
-- took live[0], and popups are fetched ordered by end_date, so "featured"
-- silently meant "ends soonest" — the same rule as the "Ending soon" rail
-- directly below it, showing the same pop-up twice.
--
-- CONTENT.md §2 says editorial judgment is the moat. This is the one slot on
-- Home where that judgment shows; everything else there is a date filter.

alter table public.popups
  add column if not exists featured boolean not null default false;

comment on column public.popups.featured is
  'Hand-picked hero for the Home screen. At most one row may be true — see '
  'popups_one_featured. Unset falls back to the pop-up ending soonest.';

-- Exactly one, enforced rather than trusted. Without this a second tick would
-- not fail; the app would just quietly show whichever the query returned
-- first, which is the ambiguity this whole change exists to remove.
drop index if exists popups_one_featured;
create unique index popups_one_featured
  on public.popups ((featured)) where featured;

-- Featuring an ended pop-up is worse than featuring nothing: it is the largest
-- card on the screen and it would be advertising something you cannot go to.
-- The client falls back on its own, but this stops the row being set at all.
alter table public.popups
  drop constraint if exists popups_featured_must_be_current;
alter table public.popups
  add constraint popups_featured_must_be_current
    check (not featured or (published and end_date >= current_date));
