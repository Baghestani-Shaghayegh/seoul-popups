-- draft_from_candidate must declare where the photo came from.
--
-- Migration 015 made "a photo with no stated origin" unrepresentable. This
-- function copies popup_candidates.og_image_url straight into popups.image_url,
-- so without this change every draft with a photo would fail the new check.
--
-- 'venue' is the honest label: enrich-candidates only accepts og:image from a
-- TIER-1 source, which is the venue's own newsroom asset.
--
-- Body is otherwise byte-identical to the version created in 012/014.
CREATE OR REPLACE FUNCTION public.draft_from_candidate(p_candidate uuid, p_name text, p_tagline text, p_description text, p_category text, p_start date DEFAULT NULL::date, p_end date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.popup_candidates%rowtype;
  v public.venues%rowtype;
  s_start date;
  s_end   date;
  new_id  uuid;
begin
  select * into c from public.popup_candidates where id = p_candidate;
  if not found then
    raise exception 'candidate % not found', p_candidate;
  end if;

  -- Without this, a retry or a typo-correction re-run silently created a
  -- SECOND popups row and repointed the candidate at it, orphaning the first
  -- (unpublished, unreferenced, and invisible in candidate_review).
  if c.status = 'accepted' and c.popup_id is not null then
    raise exception
      'candidate already drafted as popup % — edit that row instead', c.popup_id;
  end if;

  if c.venue_id is null then
    raise exception 'candidate has no venue — add/point at a venues row first so the pin is verified, not guessed';
  end if;
  select * into v from public.venues where id = c.venue_id;
  if not found then
    raise exception 'venue % missing', c.venue_id;
  end if;

  -- venues columns are nullable but the popups equivalents are NOT NULL, so an
  -- unverified venue used to fail with a raw 23502 instead of a useful message.
  -- candidate_review already exposes venue_has_pin, so this state is expected.
  if v.latitude is null or v.longitude is null
     or v.subway_line is null or v.subway_station is null
     or v.neighborhood is null then
    raise exception
      'venue "%" is missing pin/subway/neighbourhood — verify it before drafting', v.name;
  end if;

  s_start := coalesce(p_start, c.extracted_start);
  s_end   := coalesce(p_end,   c.extracted_end);
  if s_start is null or s_end is null then
    raise exception 'need both dates: extracted start=% end=% (evidence: %). Pass p_start/p_end explicitly if the source states them in a form we do not parse',
      c.extracted_start, c.extracted_end, coalesce(c.date_evidence, 'none');
  end if;

  -- The validator's Seoul box, enforced here too: popups_latitude_check only
  -- bounds +/-90, so the one-call path was weaker than the JSON path.
  if v.latitude not between 37.4 and 37.7 or v.longitude not between 126.7 and 127.2 then
    raise exception 'venue "%" pin (%, %) is outside Seoul', v.name, v.latitude, v.longitude;
  end if;
  if length(btrim(p_name)) = 0 or length(btrim(p_tagline)) = 0
     or length(btrim(p_description)) = 0 then
    raise exception 'name, tagline and description must be non-empty';
  end if;

  insert into public.popups
    (name, tagline, description, neighborhood, category,
     start_date, end_date, hours, image_url, image_source,
     latitude, longitude, pin_precision,
     subway_line, subway_station, subway_exit, subway_walk_minutes,
     reservable, source_url, source_name, published)
  values
    (btrim(p_name), btrim(p_tagline), btrim(p_description), v.neighborhood, p_category,
     s_start, s_end, v.default_hours,
     c.og_image_url,
     -- og:image is only ever accepted from a TIER-1 source (enrich-candidates),
     -- i.e. the venue's own newsroom asset. Declared here because migration 015
     -- makes a photo without a stated origin unrepresentable.
     case when c.og_image_url is null then null else 'venue' end,
     v.latitude, v.longitude, v.pin_precision,
     v.subway_line, v.subway_station, v.subway_exit, v.subway_walk_minutes,
     false, c.url, 'discovery scan', false)
  returning id into new_id;

  update public.popup_candidates
     set status = 'accepted', popup_id = new_id
   where id = p_candidate;

  return new_id;
end;
$function$;
