-- 007 — Expo push tokens, one or more per signed-in user (a user may have
-- several devices). The notify-ending-soon Edge Function reads these to send a
-- push to the owners of saved popups that are about to end. Own-rows RLS.
--
-- Server-sent alerts require sign-in: the server needs to know your saves
-- (public.user_favorites), which only exist for signed-in users. Guests' saves
-- stay local, so they don't receive server pushes.

create table if not exists public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "users manage their own push tokens" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Who to push: each device token whose owner saved a popup ending within N days.
-- Called by the notify-ending-soon Edge Function with the service role.
create or replace function public.ending_soon_push_targets(within_days int default 3)
returns table (token text, popup_name text, end_date date)
language sql
stable
as $$
  select pt.token, p.name, p.end_date
  from public.user_favorites uf
  join public.popups p
    on p.id = uf.popup_id
   and p.published
   and p.end_date >= current_date
   and p.end_date <= current_date + within_days
  join public.push_tokens pt on pt.user_id = uf.user_id;
$$;
