-- User profiles: a display name and avatar the person actually chose.
--
-- Until now the home header was hardcoded — app/(tabs)/index.tsx literally
-- rendered "Hi, Sara" and the letter S, so every user on every install was
-- greeted as Sara. There was nothing to edit because there was nothing there.
--
-- No `email` column on purpose. It already exists on auth.users and reaches the
-- client on session.user.email; copying it here would create a second thing to
-- keep in sync for no gain, and more PII sitting in a public-schema table.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Not unique. Nothing looks a user up by name yet, so a uniqueness constraint
  -- would only buy a "that name is taken" error path nobody benefits from.
  -- Bounded here rather than in the client so an empty string or a 500-char
  -- name is unrepresentable, the same posture as 010/015.
  display_name text
    check (display_name is null or char_length(btrim(display_name)) between 1 and 40),
  avatar_url text
    check (avatar_url is null or avatar_url like 'https://%'),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Deliberately narrower than 006's `for all`: three policies, and NO public
-- read. Profiles are not a social feature — nobody needs to see anyone else's
-- name. If "who else saved this" ever ships, that is the moment to debate a
-- public-read policy, not now.
create policy "users read their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "users update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Insert exists so a client upsert can repair a row the trigger below failed to
-- create. Without it a swallowed trigger error would be permanent.
create policy "users insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Reuses public.set_updated_at() from 003 — do not add a second one.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Seed a profile when an account is created, so an OAuth user has their real
-- name and picture before they ever open the profile screen.
--
-- security definer + empty search_path: the trigger fires as supabase_auth_admin,
-- which has no rights on public.profiles. Same pattern as 007 and 016.
--
-- ⚠️ The exception handler is the most important line in this file. An AFTER
-- INSERT trigger on auth.users that RAISES makes Supabase abort the signup with
-- "Database error saving new user" — sign-up breaks for everyone. A missing
-- profile row is recoverable (the client upserts on first edit); a broken
-- signup is not. Never let this function propagate an error.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name   text;
  v_avatar text;
begin
  -- Providers disagree on key names: Google sends full_name + avatar_url AND
  -- name + picture; Kakao sends name. The custom Naver flow authenticates via
  -- verifyOtp, so its metadata is usually empty — hence the email fallback,
  -- which also covers plain email/password signup.
  --
  -- Both values are clamped to what the CHECK constraints accept BEFORE the
  -- insert. Otherwise a 41-character name or an http:// avatar raises, the
  -- handler below swallows it, and the user silently gets no profile row at
  -- all — losing the name as well as the picture, since it is one insert.
  v_name := nullif(left(btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'preferred_username',
    split_part(coalesce(new.email, ''), '@', 1)
  )), 40), '');

  v_avatar := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  )), '');
  if v_avatar is not null and v_avatar not like 'https://%' then
    v_avatar := null;
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, v_name, v_avatar)
  on conflict (id) do nothing;
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill everyone who signed up before the trigger existed. Idempotent, so
-- re-running this file is safe.
-- Same clamping as the trigger — an over-long name here would abort the whole
-- backfill rather than skipping one row.
insert into public.profiles (id, display_name, avatar_url)
select u.id, x.nm, case when x.av like 'https://%' then x.av end
from auth.users u
cross join lateral (
  select
    nullif(left(btrim(coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      u.raw_user_meta_data ->> 'preferred_username',
      split_part(coalesce(u.email, ''), '@', 1)
    )), 40), '') as nm,
    nullif(btrim(coalesce(
      u.raw_user_meta_data ->> 'avatar_url',
      u.raw_user_meta_data ->> 'picture'
    )), '') as av
) x
on conflict (id) do nothing;
