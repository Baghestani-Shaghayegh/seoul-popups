-- 021 — Naver 지역 discovery (applied 2026-08-07).
--
-- Wires NAVER API HUB's 지역(local) search into the existing discovery queue.
-- Same contract as 009: this automates DISCOVERY only. Nothing here writes to
-- public.popups, and nothing here asserts a date.
--
-- WHY local and not blog/news. Measured 2026-08-07 (see the naver-search header
-- for the full table): blog sorted by date was 9/30 real pop-ups — the rest was
-- real-estate and job spam containing the word 팝업스토어. But Naver classifies
-- 지역 results under a literal `팝업스토어` category, with sub-categories like
-- `팝업스토어>뷰티 팝업`. The corpus is pre-filtered by Naver, so there is no
-- keyword guessing and no scoring heuristic to get wrong.
--
-- WHAT NAVER GIVES vs WHAT IT DOESN'T. It returns name, category, floor-level
-- road address, WGS84 coordinates, and a link to the brand's own page. It does
-- NOT return dates or photos — those are Naver Place data with no public API
-- (checked against NCP's full 3,176-doc index: Maps, CLOVA and Papago are the
-- only NAVER product families, and API HUB has no Place or 예약 endpoint).
-- Dates and og:image therefore come from the linked brand page, which is what
-- enrich-candidates already does for every other source.

-- Naver's answers are HINTS, not assertions — same rule as detected_dates in
-- 009, which deliberately stores literal matched strings rather than parsed
-- dates. A human promotes these to popups.latitude/longitude at draft time;
-- draft-candidate must never copy them straight through.
alter table public.popup_candidates
  add column if not exists detected_address text,
  add column if not exists detected_latitude numeric(9, 6),
  add column if not exists detected_longitude numeric(9, 6),
  -- Naver's own taxonomy string, e.g. '팝업스토어>웹툰, 애니메이션 팝업'. Kept
  -- verbatim rather than mapped to our Category enum: the mapping is a judgment
  -- call ('캐릭터 팝업' could be Art or Lifestyle) and belongs with the human.
  add column if not exists detected_category text;

-- Coordinates are only meaningful as a pair, and only inside Seoul. A row with
-- one half of a pair is a parsing bug, not a partial result.
alter table public.popup_candidates
  drop constraint if exists popup_candidates_detected_coords;
alter table public.popup_candidates
  add constraint popup_candidates_detected_coords check (
    (detected_latitude is null) = (detected_longitude is null)
    and (detected_latitude is null or
         (detected_latitude between 37.4 and 37.7 and
          detected_longitude between 126.7 and 127.2))
  );

-- The source row scan-naver attributes its candidates to.
--
-- TIER 1 is deliberate and load-bearing: enrich-candidates only trusts og:image
-- from a tier-1 source (011-venues.sql). It is justified here because the URL
-- stored on the candidate is NOT a Naver URL — 지역 returns the venue's own
-- channel. Across the 2026-08-07 sample every link was brand-owned: the brand's
-- Instagram, birkenstock.com, branden.shop, inventario.kr, be-mill.com. If an
-- aggregator link ever shows up here, drop this to tier 2 and the image is
-- skipped automatically.
--
-- url is the API endpoint rather than a page: popup_sources.url is `unique` and
-- `like 'https://%'`, and this satisfies both while naming what was actually
-- called. link_pattern is meaningless for an API source (it exists to pick
-- detail anchors out of an index page) — scan-naver never reads it.
insert into public.popup_sources
  (display_name, url, tier, link_pattern, enabled, fetch_interval, notes)
values
  ('NAVER 지역 검색',
   'https://naverapihub.apigw.ntruss.com/search/v1/local',
   1,
   'n/a — API source, not an index page',
   true,
   '1 day',
   'NAVER API HUB 지역 corpus. Free tier: 25,000 calls/day, 775,000/month, shared across all 검색 APIs on the app. scan-naver spends one call per query per run. Secrets NCP_API_KEY_ID / NCP_API_KEY — deliberately NOT NAVER_CLIENT_*, which naver-auth uses for developers.naver.com login (Edge Function secrets are project-wide).')
on conflict (url) do nothing;
