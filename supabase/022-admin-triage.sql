-- 022 — Admin triage (applied 2026-08-07).
--
-- The discovery queue has had no reader since 009. scan-sources and scan-naver
-- fill popup_candidates, enrich-candidates annotates it, and then it stops:
-- popup_candidates has RLS enabled with ZERO policies, and candidate_queue
-- revokes anon and authenticated outright. That is correct — a queue of
-- unverified rows must never be readable by the app's users — but it also means
-- the only way to publish a candidate was to run SQL by hand.
--
-- This adds the missing half: an explicit admin list, so a triage screen can
-- read the queue through an Edge Function without opening the table to anyone.

-- Deliberately a table and not a claim on auth.users. A JWT claim would have to
-- be re-issued to change, and would ride in every request the app makes; a row
-- is revoked by deleting it and is checked only where it matters.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

-- RLS on with NO policies, matching popup_candidates: reachable by the service
-- role only. A signed-in user must not be able to enumerate admins, and must
-- certainly not be able to add themselves.
alter table public.admins enable row level security;

-- Seeded by email rather than a pasted uuid so this file stays reproducible on
-- a fresh database. No-op if the account does not exist yet.
insert into public.admins (user_id, note)
select id, 'project owner — seeded by 022'
from auth.users
where email = 'sarayoon97@gmail.com'
on conflict (user_id) do nothing;

-- Everything the triage screen shows, in one place. security_invoker stays off
-- (the default for this view is invoker=false) — it is reached only via the
-- service role inside the triage function, never by a end-user session.
create or replace view public.triage_queue as
select
  c.id,
  c.title,
  c.url,
  c.excerpt,
  c.status,
  c.score,
  c.score_reasons,
  s.display_name          as source,
  s.tier,
  c.detected_category,
  c.detected_neighborhood,
  c.detected_address,
  c.detected_latitude,
  c.detected_longitude,
  c.detected_dates,
  c.extracted_start,
  c.extracted_end,
  c.date_evidence,
  c.extract_notes,
  c.og_image_url,
  c.venue_id,
  v.name                  as venue_name,
  c.first_seen_at,
  c.last_seen_at
from public.popup_candidates c
join public.popup_sources s on s.id = c.source_id
left join public.venues v on v.id = c.venue_id
where c.status = 'new'
order by c.score desc, c.first_seen_at desc;

revoke all on public.triage_queue from anon, authenticated;
