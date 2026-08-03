-- 009 — Discovery queue (applied 2026-08-03).
--
-- Automates DISCOVERY only: surfaces that a pop-up MIGHT exist. It never
-- asserts a field value and never writes to public.popups. Both aggregator
-- dates this project actually verified were wrong (Evangelion off by a month;
-- Pompompurin listed with an end date when it is a permanent store), so
-- verification stays human — see supabase/functions/scan-sources/README.md.
--
-- Applied via the Supabase MCP as migrations:
--   popup_discovery_queue -> discovery_queue_v1 -> discovery_queue_views
-- Reproduced here so schema history lives in git.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.popup_sources (
  id                uuid primary key default gen_random_uuid(),
  display_name      text not null,
  url               text not null unique check (url like 'https://%'),
  -- 1 = venue/brand official, 2 = press, 3 = aggregator (discovery-only).
  -- v1 seeds NO tier-3 rows: all of the ToS risk, and their links are blocked
  -- from reaching a user by migration 008 anyway.
  tier              smallint not null default 1 check (tier in (1, 2, 3)),
  -- Which anchors on the index page are detail pages. Without this you queue
  -- the site's nav; with it you queue its articles.
  link_pattern      text not null,
  enabled           boolean not null default true,
  -- Strictly less than the cron period, or jitter skips a whole cycle.
  fetch_interval    interval not null default '3 days',
  etag              text,
  last_modified     text,
  robots_allows     boolean,
  robots_checked_at timestamptz,
  crawl_delay_seconds integer,
  -- last_link_count is THE breakage signal. A healthy source in a quiet week
  -- matches many links and yields zero new candidates; a broken one matches
  -- zero links. Never infer health from new-candidate count.
  last_fetched_at   timestamptz,
  last_status       text,
  last_link_count   integer,
  consecutive_failures integer not null default 0,
  notes             text
);

create table if not exists public.popup_candidates (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references public.popup_sources(id) on delete cascade,
  -- Unique GLOBALLY so press syndication of the same article dedupes for free.
  url           text not null unique,
  title         text not null,
  excerpt       text,
  -- LITERAL matched strings ("7/26(토)~8/12(수)") — never parsed dates. A
  -- year-less Korean range is exactly how this project got a pop-up wrong.
  detected_dates text[] not null default '{}',
  detected_neighborhood text
    check (detected_neighborhood in ('Seongsu', 'Hongdae', 'Gangnam')),
  score         integer not null default 0,
  score_reasons text[] not null default '{}',
  content_hash  text not null,          -- NOT a key; detects "page changed"
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  content_changed_at timestamptz,
  status        text not null default 'new'
                  check (status in ('new', 'accepted', 'rejected')),
  rejected_reason text,
  -- A hint for a human, never an action: a false merge silently hides a real
  -- new pop-up, while a duplicate costs five seconds to dismiss.
  possible_duplicate_of uuid[] not null default '{}',
  popup_id      uuid references public.popups(id) on delete set null,
  notes         text
);

create index if not exists popup_candidates_status_idx
  on public.popup_candidates (status, score desc);

-- Heartbeat: a job that never ran cannot alarm about itself.
create table if not exists public.scan_runs (
  id                uuid primary key default gen_random_uuid(),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  sources_attempted integer not null default 0,
  sources_ok        integer not null default 0,
  sources_failed    integer not null default 0,
  links_matched     integer not null default 0,
  new_candidates    integer not null default 0,
  detail            jsonb
);

-- Human-authored match keys (Korean name, romanization, IP name), filled at
-- triage. Becomes the real dedupe key over time.
alter table public.popups add column if not exists aliases text[];

alter table public.popup_sources    enable row level security;
alter table public.popup_candidates enable row level security;
alter table public.scan_runs        enable row level security;

create or replace view public.candidate_queue with (security_invoker = true) as
select c.id, s.display_name as source, s.tier, c.title, c.url,
       c.detected_dates, c.detected_neighborhood, c.score, c.score_reasons,
       c.possible_duplicate_of, c.first_seen_at, c.last_seen_at
from public.popup_candidates c
join public.popup_sources s on s.id = c.source_id
where c.status = 'new'
order by s.tier, c.score desc, c.first_seen_at desc;

create or replace view public.scan_health with (security_invoker = true) as
select s.display_name, s.tier, s.enabled, s.last_fetched_at, s.last_status,
       s.last_link_count, s.consecutive_failures,
       case
         when not s.enabled                              then 'disabled'
         when s.last_fetched_at is null                  then 'never_run'
         when s.consecutive_failures >= 2                then 'failing'
         when coalesce(s.last_link_count, 0) = 0         then 'ZERO_LINKS_suspect_breakage'
         when s.last_fetched_at < now() - interval '8 days' then 'overdue'
         else 'ok'
       end as health
from public.popup_sources s;

revoke all on public.candidate_queue from anon, authenticated;
revoke all on public.scan_health from anon, authenticated;

-- Schedule: Tue + Fri 07:00 KST. timeout_milliseconds is REQUIRED — pg_net
-- defaults to 5s, this scan needs ~20s, and because http_post only enqueues,
-- pg_cron records a timed-out request as SUCCEEDED. Verify real delivery in
-- net._http_response, never cron.job_run_details.
--
-- select cron.schedule('scan-sources-twice-weekly', '0 22 * * 1,4', $$
--   select net.http_post(
--     url := 'https://<ref>.supabase.co/functions/v1/scan-sources',
--     headers := jsonb_build_object('Content-Type','application/json',
--                                   'Authorization','Bearer <anon-key>'),
--     timeout_milliseconds := 150000);
-- $$);
