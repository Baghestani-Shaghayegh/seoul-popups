-- 014 — Close three gaps found in code review. (applied 2026-08-03)
--
-- 1. image_url was the ONLY user-facing URL column without the aggregator ban
--    that 008 gave website_url / instagram_url / reservation_url.
--    draft_from_candidate writes og_image_url straight into it, and
--    popup_sources.tier is an ordinary editable smallint — one mis-set tier was
--    all that stood between an aggregator's watermarked crop and the app.
-- 2. draft_from_candidate was not idempotent: a retry or a typo-correction
--    re-run silently created a SECOND popups row and repointed the candidate
--    at it, orphaning the first (unpublished, unreferenced, invisible in
--    candidate_review).
-- 3. It trusted the venue row. venues columns are nullable but the popups
--    equivalents are NOT NULL, so an unverified venue failed with a raw 23502
--    instead of a useful message — and the one-call path skipped the Seoul
--    bounding box and non-empty checks that validate-popup.mjs enforces.

alter table public.popups
  add constraint popups_image_url_not_aggregator
    check (not public.is_aggregator_link(image_url));
-- draft_from_candidate() as deployed:
create or replace function public.draft_from_candidate(
  p_candidate uuid, p_name text, p_tagline text, p_description text,
  p_category text, p_start date default null, p_end date default null)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare
  c public.popup_candidates%rowtype;
  v public.venues%rowtype;
  s_start date; s_end date; new_id uuid;
begin
  select * into c from public.popup_candidates where id = p_candidate;
  if not found then raise exception 'candidate % not found', p_candidate; end if;

  if c.status = 'accepted' and c.popup_id is not null then
    raise exception 'candidate already drafted as popup % — edit that row instead', c.popup_id;
  end if;

  if c.venue_id is null then
    raise exception 'candidate has no venue — add/point at a venues row first so the pin is verified, not guessed';
  end if;
  select * into v from public.venues where id = c.venue_id;
  if not found then raise exception 'venue % missing', c.venue_id; end if;

  if v.latitude is null or v.longitude is null
     or v.subway_line is null or v.subway_station is null
     or v.neighborhood is null then
    raise exception 'venue "%" is missing pin/subway/neighbourhood — verify it before drafting', v.name;
  end if;

  s_start := coalesce(p_start, c.extracted_start);
  s_end   := coalesce(p_end,   c.extracted_end);
  if s_start is null or s_end is null then
    raise exception 'need both dates: extracted start=% end=% (evidence: %). Pass p_start/p_end explicitly if the source states them in a form we do not parse',
      c.extracted_start, c.extracted_end, coalesce(c.date_evidence, 'none');
  end if;

  if v.latitude not between 37.4 and 37.7 or v.longitude not between 126.7 and 127.2 then
    raise exception 'venue "%" pin (%, %) is outside Seoul', v.name, v.latitude, v.longitude;
  end if;
  if length(btrim(p_name)) = 0 or length(btrim(p_tagline)) = 0
     or length(btrim(p_description)) = 0 then
    raise exception 'name, tagline and description must be non-empty';
  end if;

  insert into public.popups
    (name, tagline, description, neighborhood, category,
     start_date, end_date, hours, image_url,
     latitude, longitude, pin_precision,
     subway_line, subway_station, subway_exit, subway_walk_minutes,
     reservable, source_url, source_name, published)
  values
    (btrim(p_name), btrim(p_tagline), btrim(p_description), v.neighborhood, p_category,
     s_start, s_end, v.default_hours, c.og_image_url,
     v.latitude, v.longitude, v.pin_precision,
     v.subway_line, v.subway_station, v.subway_exit, v.subway_walk_minutes,
     false, c.url, 'discovery scan', false)
  returning id into new_id;

  update public.popup_candidates set status = 'accepted', popup_id = new_id
   where id = p_candidate;
  return new_id;
end;
$function$;

revoke all on function public.draft_from_candidate from anon, authenticated;
