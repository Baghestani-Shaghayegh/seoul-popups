-- 012 — Triage view, one-call drafting, and a coverage alarm.
-- (applied 2026-08-03. draft_from_candidate was later hardened — see 014,
--  which supersedes the definition below. Kept here for history.)

-- What a human opens: everything needed to judge a candidate without
-- re-opening the source. date_evidence sits next to the parsed dates on
-- purpose — the parse is checkable at a glance rather than trusted.
create or replace view public.candidate_review with (security_invoker = true) as
select c.id, s.display_name as source, s.tier, c.title, c.url, c.excerpt,
       c.extracted_start, c.extracted_end, c.date_evidence, c.extract_notes,
       v.name as venue, v.neighborhood as venue_neighborhood,
       (v.latitude is not null) as venue_has_pin,
       (c.og_image_url is not null) as has_image,
       c.score, c.possible_duplicate_of, c.first_seen_at
from public.popup_candidates c
join public.popup_sources s on s.id = c.source_id
left join public.venues v on v.id = c.venue_id
where c.status = 'new'
order by (c.extracted_end is not null) desc, s.tier, c.score desc;

revoke all on public.candidate_review from anon, authenticated;

-- The literal "don't run out" check. Counts what a user would actually see
-- per neighbourhood, so an empty area is visible before it ships.
create or replace view public.coverage_health with (security_invoker = true) as
with d as (select (now() at time zone 'Asia/Seoul')::date as today)
select n.neighborhood,
       count(p.id) filter (
         where p.published and p.start_date <= d.today and p.end_date >= d.today
       ) as live_now,
       count(p.id) filter (
         where p.published and p.start_date <= d.today + 7 and p.end_date >= d.today + 7
       ) as live_in_7d,
       case
         when count(p.id) filter (
           where p.published and p.start_date <= d.today + 7 and p.end_date >= d.today + 7
         ) = 0 then 'EMPTY_IN_7_DAYS'
         when count(p.id) filter (
           where p.published and p.start_date <= d.today + 7 and p.end_date >= d.today + 7
         ) < 3 then 'thin_in_7_days'
         else 'ok'
       end as status
from (values ('Seongsu'),('Hongdae'),('Gangnam')) as n(neighborhood)
cross join d
left join public.popups p on p.neighborhood = n.neighborhood
group by n.neighborhood, d.today;

revoke all on public.coverage_health from anon, authenticated;
