-- Week 14 addition only. Run this in Supabase > SQL Editor on a project that already has supabase/schema.sql
-- applied from a prior week. Stack-floor requirement for Week 14: "working calculator logic with saved scenarios."

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  segment text not null check (segment in ('export', 'domestic')),
  band_id text not null check (band_id in ('low', 'mid', 'high')),
  customers int not null check (customers between 0 and 100000),
  cycles_per_year numeric not null check (cycles_per_year between 0 and 1000),
  annual_mxn numeric not null check (annual_mxn >= 0),
  monthly_mxn numeric not null check (monthly_mxn >= 0),
  created_at timestamptz not null default now()
);

create index on public.scenarios (user_id, created_at desc);

alter table public.scenarios enable row level security;

create policy "scenarios select own" on public.scenarios for select using (user_id = auth.uid());
create policy "scenarios insert own" on public.scenarios for insert with check (user_id = auth.uid());
create policy "scenarios delete own" on public.scenarios for delete using (user_id = auth.uid());
