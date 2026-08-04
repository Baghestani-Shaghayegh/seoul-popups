-- 011 — Venues as first-class entities, + candidate enrichment fields.
-- (applied 2026-08-03 via the Supabase MCP; reproduced here so schema history
--  lives in git — see 009's note. Replaying the repo without this yields a
--  schema where scan-sources reads popup_sources.source_type off a column that
--  does not exist and every enrich-candidates write fails silently.)
--
-- Why venues: a pop-up's hardest fields (pin, subway line/station/exit, walk
-- minutes) are properties of the BUILDING, not the pop-up. Verify a venue once
-- and every future pop-up there inherits correct location data instead of a
-- guess. Direct fix for the 5-of-9 estimated exits and the four pop-ups that
-- shared one AK Plaza pin.

create table if not exists public.venues (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  name_ko       text,
  aliases       text[] not null default '{}',
  neighborhood  text check (neighborhood in ('Seongsu', 'Hongdae', 'Gangnam')),
  latitude      double precision,
  longitude     double precision,
  pin_precision text check (pin_precision in ('rooftop','address','venue','estimated')),
  subway_line   text,
  subway_station text,
  subway_exit   text,
  subway_walk_minutes integer,
  default_hours text,
  website_url   text,
  verified_at   date,
  notes         text
);

alter table public.venues enable row level security;

alter table public.popup_candidates
  add column if not exists detail_fetched_at timestamptz,
  add column if not exists venue_id uuid references public.venues(id),
  -- og:image from a TIER-1 source only (the venue's own asset, behind the tag
  -- that exists for syndication). Never an aggregator's crop.
  add column if not exists og_image_url text,
  -- Parsed only when the source states it unambiguously; date_evidence keeps
  -- the verbatim substring beside it so a human can check the parse.
  add column if not exists extracted_start date,
  add column if not exists extracted_end date,
  add column if not exists date_evidence text,
  add column if not exists extract_notes text[];

-- Seeded from sources verified 2026-08-03. Galleria is TWO rows on purpose:
-- EAST and WEST have different addresses AND different subway exits — the
-- ambiguity that blocked publishing the Crocs pop-up.
insert into public.venues
  (name, name_ko, aliases, neighborhood, latitude, longitude, pin_precision,
   subway_line, subway_station, subway_exit, subway_walk_minutes, default_hours,
   website_url, verified_at, notes)
values
  ('Shinsegae Department Store Gangnam', '신세계백화점 강남점',
   array['신세계백화점 강남점','신세계 강남점','신세계 강남','스위트파크','더 스테이지','shinsegae gangnam','강남점','신세계 강남점 스위트파크','스위트 파크'],
   'Gangnam', 37.5048, 127.0043, 'venue',
   'Line 3', 'Express Bus Terminal', null, null, '10:30 – 20:00',
   'https://www.shinsegae.com/store/main.do?storeCd=SC00002', '2026-08-03',
   'B1 food floor connects directly into the station; exit left null because it is reached by underground link, not a numbered exit. Technically Seocho-gu but reads as Gangnam.'),
  ('Galleria Luxury Hall EAST', '갤러리아 명품관 EAST',
   array['갤러리아 명품관 east','명품관 east','galleria east'],
   'Gangnam', 37.5264, 127.0285, 'address',
   'Suin-Bundang Line', 'Apgujeong Rodeo', '1', 3, null,
   'https://dept.galleria.co.kr', '2026-08-03',
   '압구정로 407. Exits 1/2, ~159m. Distinct building from WEST — do not conflate.'),
  ('Galleria Luxury Hall WEST', '갤러리아 명품관 WEST',
   array['갤러리아 명품관 west','명품관 west','galleria west'],
   'Gangnam', 37.5271, 127.0276, 'address',
   'Suin-Bundang Line', 'Apgujeong Rodeo', '7', 1, null,
   'https://dept.galleria.co.kr', '2026-08-03',
   '압구정로 343. Directly connected to Exit 7 (~16m).'),
  ('KARY MARKET Sinsa', '캐리마켓 신사',
   array['캐리마켓 신사','캐리마켓','kary market','karymarket'],
   'Gangnam', 37.5205, 127.0229, 'venue',
   'Line 3', 'Sinsa', '8', 8, '10:00 – 21:00',
   'https://karymarket.com', '2026-08-03',
   '가로수길 82. Runs monthly pop-ups. Coords venue-level.'),
  ('LCDC Seoul', 'LCDC 서울',
   array['lcdc seoul','lcdc 서울','lcdc'],
   'Seongsu', 37.5432, 127.0561, 'venue',
   'Line 2', 'Seongsu', '3', 8, null,
   'https://lcdc-seoul.com', '2026-08-03',
   'Seongsu venue running back-to-back events. Coords venue-level.')
on conflict (name) do nothing;
