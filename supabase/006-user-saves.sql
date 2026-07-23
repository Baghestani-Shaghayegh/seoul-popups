-- 006 — Per-user saves. Backs favorites + "been there" when signed in; guests
-- keep using local AsyncStorage. On sign-in the app merges the guest's local
-- ids up into these tables (see src/hooks/useSyncedIdSet.ts).
--
-- No FK on popup_id (same reasoning as collections): the app resolves popups
-- client-side and ignores ids no longer in the catalogue, so re-seeding popups
-- can't break a user's saves. RLS scopes every row to its owner — a user can
-- only ever see or change their own (SECURITY.md §5).

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  popup_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, popup_id)
);

create table if not exists public.user_visited (
  user_id uuid not null references auth.users (id) on delete cascade,
  popup_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, popup_id)
);

alter table public.user_favorites enable row level security;
alter table public.user_visited enable row level security;

create policy "users manage their own favorites" on public.user_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own visited" on public.user_visited
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
