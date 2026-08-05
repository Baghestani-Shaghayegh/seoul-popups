-- Notifications, so a push has somewhere to live after it is dismissed.
--
-- notify-ending-soon already sends real pushes, but stored nothing: miss the
-- banner and it was gone. That is why the home header could not have a bell —
-- there was no inbox behind it, and a bell over an empty screen is the same
-- decorative UI as the "Hi, Sara" greeting and the hardcoded location pill.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Constrained rather than free text: the app switches on it to pick an icon
  -- and a destination, so an unknown kind is a rendering bug waiting to happen.
  kind text not null check (kind in ('ending_soon')),
  popup_id uuid references public.popups (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- The sender runs on a schedule, so without this a user gets the same "ending
-- soon" row every single run until the pop-up closes.
create unique index if not exists notifications_one_per_popup_kind
  on public.notifications (user_id, popup_id, kind)
  where popup_id is not null;

create index if not exists notifications_user_recent
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Read and mark-as-read only. Inserts come from the service role in
-- notify-ending-soon; letting a client write its own notifications would make
-- the inbox worthless as a record of what was actually sent.
drop policy if exists "users read their own notifications" on public.notifications;
create policy "users read their own notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "users mark their own notifications read" on public.notifications;
create policy "users mark their own notifications read" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The sender needs user_id and popup_id to record what it sent; the original
-- only returned what Expo needed to deliver. Return type changes, so replace.
drop function if exists public.ending_soon_push_targets(int);
create function public.ending_soon_push_targets(within_days int default 3)
returns table (
  user_id uuid,
  popup_id uuid,
  token text,
  popup_name text,
  end_date date
)
language sql
stable
set search_path = ''
as $$
  select uf.user_id, p.id, pt.token, p.name, p.end_date
  from public.user_favorites uf
  join public.popups p
    on p.id = uf.popup_id
   and p.published
   and p.end_date >= current_date
   and p.end_date <= current_date + within_days
  join public.push_tokens pt on pt.user_id = uf.user_id;
$$;
