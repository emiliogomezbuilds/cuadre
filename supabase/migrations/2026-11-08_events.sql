-- Week 13 addition only. Run this in Supabase > SQL Editor on a project that already has supabase/schema.sql
-- applied from a prior week. (schema.sql itself is also updated with this table, for anyone setting up from
-- scratch; this file is for existing projects so you don't have to re-run the whole thing.)

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cycle_id uuid references public.cycles(id) on delete cascade,
  action text not null check (action in ('cycle_created', 'file_imported', 'exception_decided', 'cycle_approved', 'export_downloaded')),
  detail text check (detail is null or char_length(detail) <= 200),
  created_at timestamptz not null default now()
);

create index on public.events (user_id, cycle_id, created_at desc);

alter table public.events enable row level security;

create policy "events select own" on public.events for select using (user_id = auth.uid());
create policy "events insert own" on public.events for insert with check (user_id = auth.uid());
create policy "events delete own" on public.events for delete using (user_id = auth.uid());
