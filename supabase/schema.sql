-- Seoul Popups — schema + row-level security for the `popups` table.
-- Apply by pasting this whole file into the Supabase SQL Editor and running it
-- once. Idempotent-ish: guarded so re-running doesn't error.
--
-- Security model (SECURITY.md §2): the table is world-READABLE via the anon
-- key and writable by NOBODY through the API. Content entry happens in the
-- Supabase dashboard (Table Editor / SQL Editor), which uses the service
-- connection and bypasses RLS. After applying, run the outside-in tests in
-- supabase/README.md.
--
-- Column naming is snake_case (SQL convention); the app maps rows to the
-- camelCase `Popup` type inside src/hooks/usePopups.ts — screens never see
-- raw rows. Columns marked "not selected by the app" are owner/editorial
-- fields; hooks must select explicit columns, never `*` (SECURITY.md §2).

create table if not exists public.popups (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),

  -- Card + detail content (Popup type)
  name                text not null,
  tagline             text not null,
  description         text not null,
  neighborhood        text not null
                      check (neighborhood in ('Seongsu', 'Hongdae', 'Gangnam')),
  category            text not null
                      check (category in ('Fashion', 'Beauty', 'Food', 'Art', 'Lifestyle')),
  image_url           text not null check (image_url like 'https://%'),

  -- Dates as real DATE columns; PostgREST serializes them as 'YYYY-MM-DD',
  -- which is exactly the ISO-string shape the domain layer expects.
  start_date          date not null,
  end_date            date not null check (end_date >= start_date),
  hours               text not null,

  -- Subway directions (SubwayDirection type) — the ⭐ differentiator.
  subway_line         text not null,
  subway_station      text not null,
  subway_exit         text not null,
  subway_walk_minutes integer not null check (subway_walk_minutes >= 0),

  -- Map
  latitude            double precision not null check (latitude between -90 and 90),
  longitude           double precision not null check (longitude between -180 and 180),

  -- Links (detail-screen link-outs; https enforced per SECURITY.md §4).
  reservable          boolean not null default false,
  instagram_url       text check (instagram_url is null or instagram_url like 'https://%'),
  website_url         text check (website_url is null or website_url like 'https://%'),
  reservation_url     text check (reservation_url is null or reservation_url like 'https://%'),

  -- Editorial provenance — where we found the popup, for weekly re-checking
  -- (CONTENT.md §5). Not selected by the app.
  source_url          text check (source_url is null or source_url like 'https://%')
);

comment on table public.popups is
  'Curated Seoul popup stores. Public read-only; entry via dashboard only.';

-- "Ending soon" rails and date-window filters sort/filter on end_date.
create index if not exists popups_end_date_idx on public.popups (end_date);

-- ---------------------------------------------------------------------------
-- Row Level Security: enabled BEFORE any real data lands (SECURITY.md rule 1).
-- ---------------------------------------------------------------------------

alter table public.popups enable row level security;

-- Everyone (logged in or not) may read; there are no write policies, so
-- INSERT/UPDATE/DELETE via the anon or authenticated roles are all denied.
drop policy if exists "Public read access" on public.popups;
create policy "Public read access"
  on public.popups
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Example row (reference for the shape — real entry happens in the Table
-- Editor per CONTENT.md §5). Uncomment to insert one test row, then delete
-- it from the Table Editor after verifying the app renders it.
-- ---------------------------------------------------------------------------

-- insert into public.popups
--   (name, tagline, description, neighborhood, category, image_url,
--    start_date, end_date, hours,
--    subway_line, subway_station, subway_exit, subway_walk_minutes,
--    latitude, longitude, reservable, source_url)
-- values
--   ('Test Popup', 'Delete me after testing',
--    'A throwaway row to confirm the schema and the app wiring work.',
--    'Seongsu', 'Lifestyle',
--    'https://placehold.co/800x600/png',
--    current_date, current_date + 14, '11:00 – 20:00',
--    'Line 2', 'Seongsu', '3', 5,
--    37.5446, 127.0559, false,
--    'https://example.com/where-i-found-it');
