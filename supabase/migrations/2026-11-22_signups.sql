-- Week 15 addition only. Run this in Supabase > SQL Editor on a project that already has supabase/schema.sql
-- applied from a prior week. This is the week's real test: a public, no-sign-in opt-in capture page
-- (docs/PACKET.md, Week 15). Intentionally has NO select policy for any app role (anon or authenticated) —
-- the raw export is read by Emilio directly via this SQL editor, never exposed through the app itself,
-- since this table holds real contact information from real people, not a signed-in user's own rows.

create table public.signups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  contact text not null check (char_length(contact) between 3 and 120),
  role_title text check (role_title is null or char_length(role_title) <= 80),
  message text check (message is null or char_length(message) <= 300),
  source text not null default 'other' check (source in ('linkedin_cold', 'other')),
  created_at timestamptz not null default now()
);

create index on public.signups (created_at desc);

alter table public.signups enable row level security;

-- Anyone (including an anonymous visitor) can submit the form. No select, update or delete policy for any
-- role: the only way to read this table is Emilio querying it directly as the project owner.
create policy "signups insert anyone" on public.signups for insert to anon, authenticated with check (true);

-- Week 15's real distribution test, run exactly once, from this export:
-- select name, contact, role_title, message, source, created_at from public.signups order by created_at desc;
