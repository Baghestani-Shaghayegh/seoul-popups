-- 008 — Link hygiene + honest nullability
--
-- Two problems this fixes, both found on 2026-07-27.
--
-- 1. OUTBOUND LINKS POINTED AT COMPETITORS. Five published rows sent users to
--    rival pop-up listing sites: four via `website_url` (popply, dayforyou,
--    popga ×2) and — worst — Gintama's `reservation_url`, which is the Reserve
--    button, the highest-intent tap in the app. Nulling them is not enough:
--    the same mistake is one careless Table Editor paste away. So the rule is
--    enforced by the database via CHECK constraints.
--
--    Aggregators stay legitimate as `source_url` (internal provenance, never
--    rendered — `POPUP_COLUMNS` in usePopups.ts deliberately omits it). What
--    they must never be is a link we show a visitor.
--
-- 2. NOT NULL FORCED FABRICATION. `subway_exit`, `subway_walk_minutes` and
--    `hours` were NOT NULL, so a row could not admit "we don't know yet" —
--    and content/popups-todo.md records the result: 5 of 9 published pop-ups
--    carry estimated exits and walk times, and two reuse another pop-up's pin.
--    That is precisely the ⭐ subway differentiator, guessed. A schema that
--    demands a value it cannot have will always be given a made-up one, by a
--    human or a pipeline. Make absence expressible; the UI degrades honestly.

-- ---------------------------------------------------------------------------
-- 1. Aggregator link ban
-- ---------------------------------------------------------------------------

-- Host-anchored so a legitimate brand URL that merely contains one of these
-- words in its path (https://brand.com/blog/popga) is not caught, and so a
-- merely similar host (popplyfoods.com) is not caught either.
--
-- The TLD part is `(\.[a-z]{2,})+`, not `\.[a-z]{2,}`. First version used the
-- latter and silently failed on every `.co.kr` host — i.e. on almost every
-- Korean aggregator, the exact set this exists to block. It matched
-- dayforyou.com and nothing else, so a verification query built on this same
-- function reported "0 remaining" while three competitor links sat untouched.
-- Lesson worth keeping: never verify a filter with the filter under test.
create or replace function public.is_aggregator_link(u text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select u is not null and u ~* (
    '^https?://([a-z0-9-]+\.)*'
    '(popply|popga|dayforyou|heypop|aniway|insideseoul)'
    '(\.[a-z]{2,})+(:[0-9]+)?(/|\?|$)'
  );
$$;

comment on function public.is_aggregator_link(text) is
  'True when a URL points at a competing pop-up listing site. Used to keep '
  'user-facing link columns free of competitor links; source_url is exempt '
  'because it is provenance and never rendered.';

-- Clear what is already there (5 rows as of this migration).
update public.popups set website_url = null
 where public.is_aggregator_link(website_url);

update public.popups set instagram_url = null
 where public.is_aggregator_link(instagram_url);

update public.popups set reservation_url = null
 where public.is_aggregator_link(reservation_url);

alter table public.popups
  add constraint popups_website_url_not_aggregator
    check (not public.is_aggregator_link(website_url)),
  add constraint popups_instagram_url_not_aggregator
    check (not public.is_aggregator_link(instagram_url)),
  add constraint popups_reservation_url_not_aggregator
    check (not public.is_aggregator_link(reservation_url));

-- ---------------------------------------------------------------------------
-- 2. Let a row admit what it doesn't know
-- ---------------------------------------------------------------------------

alter table public.popups
  alter column subway_exit drop not null,
  alter column subway_walk_minutes drop not null,
  alter column hours drop not null;

-- How trustworthy the map pin is. 'venue' is legitimate and common (several
-- pop-ups genuinely share one building, e.g. AK Plaza Hongdae); 'estimated'
-- means nobody has confirmed it and the UI should not imply precision.
alter table public.popups
  add column if not exists pin_precision text
    check (pin_precision in ('rooftop','address','venue','estimated'));

comment on column public.popups.pin_precision is
  'Confidence in latitude/longitude. Null = unassessed. Rows sharing a pin '
  'with another row should be venue or estimated, never rooftop.';
