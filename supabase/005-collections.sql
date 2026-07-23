-- 005 — Curated collections ("This Weekend in Seoul", "Anime Fan Trail", …).
--
-- An editorial grouping of popups. Membership is a `popup_ids` array rather
-- than a join table: the catalogue is tiny and the app already resolves popups
-- client-side, so this avoids a foreign key that would complicate re-seeding
-- (truncating popups). A stale id in the array is simply ignored by the app.
--
-- RLS mirrors popups: public can read only PUBLISHED collections; writes are
-- dashboard / service-role only (no write policy). SECURITY.md §2.

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  emoji text,
  popup_ids uuid[] not null default '{}',
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.collections enable row level security;

create policy "collections are publicly readable when published"
  on public.collections
  for select
  using (published = true);
