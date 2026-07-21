-- 003 — Trust + freshness structure for the popups catalogue.
--
-- Adds a human review gate and provenance/verification tracking so the app only
-- ever serves data a person has checked, and stale entries are easy to find.
--   • published        — rows are drafts (false) until reviewed; RLS below only
--                        exposes published rows to the app / anon key.
--   • source_name      — human-readable source, alongside the existing source_url.
--   • last_verified_at — when a human last confirmed this row against its source.
--   • updated_at       — auto-touched on every change (trigger).
--
-- Also adds popups_needs_review, a maintenance view listing ended / ending-soon
-- / stale rows (kept out of the public API).

alter table public.popups
  add column if not exists published boolean not null default false;
alter table public.popups
  add column if not exists source_name      text;
alter table public.popups
  add column if not exists last_verified_at date;
alter table public.popups
  add column if not exists updated_at        timestamptz not null default now();

-- Auto-touch updated_at. SECURITY INVOKER (default) + fixed search_path; it is a
-- trigger function, so it is not callable through the REST API.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists popups_set_updated_at on public.popups;
create trigger popups_set_updated_at
  before update on public.popups
  for each row execute function public.set_updated_at();

-- Public read is now PUBLISHED rows only. Drafts stay invisible to the app and
-- the anon key until a human publishes them. Dashboard/service role bypasses RLS.
drop policy if exists "Public read access" on public.popups;
create policy "Public read access"
  on public.popups
  for select
  to anon, authenticated
  using (published = true);

create index if not exists popups_published_end_date_idx
  on public.popups (published, end_date);

-- Maintenance surface: rows needing attention. security_invoker so it respects
-- RLS; revoked from the API roles so it is dashboard/service-only.
create or replace view public.popups_needs_review
  with (security_invoker = true) as
select
  id, name, neighborhood, published, start_date, end_date, last_verified_at,
  case
    when end_date < current_date                 then 'ended'
    when end_date <= current_date + 7            then 'ending_soon'
    when last_verified_at is null
      or last_verified_at < current_date - 14    then 'stale'
    else 'ok'
  end as review_reason
from public.popups
where end_date < current_date
   or end_date <= current_date + 7
   or last_verified_at is null
   or last_verified_at < current_date - 14;

revoke all on public.popups_needs_review from anon, authenticated;
