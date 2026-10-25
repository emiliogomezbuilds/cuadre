-- Cuadre schema. Run once in Supabase > SQL Editor.
-- Design rules (Team 8 Blueprint): RLS on every table; the version history and the decision log are append-only
-- (no update and no delete policy); no supplier score and no information about workers or collectors anywhere;
-- pasted text and photos are never stored, only the rows the coordinator confirms.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- cycles
create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number int not null check (number between 1 and 99),
  name text not null check (char_length(name) between 1 and 60),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  simulated boolean not null default false,
  first_import_at timestamptz,
  approved_at timestamptz,
  approved_single_review boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, number)
);

-- ---------------------------------------------------------------- rows (incoming data of a cycle)
create table public.rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  sku text not null check (char_length(sku) <= 40),
  component text not null check (char_length(component) <= 60),
  material text not null check (char_length(material) <= 30),
  weight_g numeric check (weight_g is null or weight_g between -1000000 and 1000000),
  recycled_pct numeric check (recycled_pct is null or recycled_pct between -1000 and 1000),
  supplier text not null check (char_length(supplier) <= 80),
  evidence_ref text check (evidence_ref is null or char_length(evidence_ref) <= 60),
  source_kind text check (source_kind is null or source_kind in ('ficha_tecnica', 'declaracion_proveedor', 'estimacion', 'recibo_papel')),
  source_file text not null check (char_length(source_file) <= 120),
  source_line int not null check (source_line between 0 and 100000),
  origin text not null check (origin in ('csv', 'simulated', 'ai_text', 'ai_photo')),
  quote text check (quote is null or char_length(quote) <= 400),
  bad text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- decisions (append-only log)
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  key text not null check (char_length(key) <= 120),
  choice text not null check (choice in ('accept_new', 'keep_previous', 'request_supplier', 'reject_row')),
  reason text not null check (char_length(reason) between 5 and 300),
  pick int check (pick is null or pick between 0 and 20),
  bulk boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- versions (append-only history of each component)
create table public.versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  key text not null check (char_length(key) <= 120),
  sku text not null check (char_length(sku) <= 40),
  component text not null check (char_length(component) <= 60),
  version int not null check (version between 1 and 999),
  removed boolean not null default false,
  snapshot jsonb check (snapshot is null or jsonb_typeof(snapshot) = 'object'),
  decision_key text check (decision_key is null or char_length(decision_key) <= 120),
  created_at timestamptz not null default now(),
  unique (user_id, key, version),
  check (removed or snapshot is not null)
);

-- ---------------------------------------------------------------- consents (also counts the daily AI limit)
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('process_data', 'ai_text', 'ai_photo')),
  granted boolean not null,
  text_version text not null check (char_length(text_version) <= 20),
  created_at timestamptz not null default now()
);

create index on public.cycles (user_id, number);
create index on public.rows (cycle_id);
create index on public.decisions (cycle_id, key, created_at desc);
create index on public.versions (user_id, key, version desc);
create index on public.consents (user_id, purpose, created_at desc);

-- ---------------------------------------------------------------- RLS on every table
alter table public.cycles enable row level security;
alter table public.rows enable row level security;
alter table public.decisions enable row level security;
alter table public.versions enable row level security;
alter table public.consents enable row level security;

-- cycles: own rows. A cycle can be edited only while it is a draft; approving it freezes it.
create policy "cycles select own" on public.cycles for select using (user_id = auth.uid());
create policy "cycles insert own" on public.cycles for insert with check (user_id = auth.uid() and status = 'draft');
create policy "cycles update own draft" on public.cycles for update using (user_id = auth.uid() and status = 'draft') with check (user_id = auth.uid());
create policy "cycles delete own" on public.cycles for delete using (user_id = auth.uid());

-- rows: own rows, insertable and removable only while the cycle is a draft.
create policy "rows select own" on public.rows for select using (user_id = auth.uid());
create policy "rows insert own draft" on public.rows for insert with check (
  user_id = auth.uid() and exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid() and c.status = 'draft')
);
create policy "rows delete own draft" on public.rows for delete using (
  user_id = auth.uid() and exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid() and c.status = 'draft')
);

-- decisions: append-only. No update policy and no delete policy: a later decision on the same key supersedes
-- an earlier one, and both stay in the log. (Deleting a whole cycle, or all data, cascades from the cycle.)
create policy "decisions select own" on public.decisions for select using (user_id = auth.uid());
create policy "decisions insert own draft" on public.decisions for insert with check (
  user_id = auth.uid() and exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid() and c.status = 'draft')
);

-- versions: append-only, same rule. Written when a cycle is approved.
create policy "versions select own" on public.versions for select using (user_id = auth.uid());
create policy "versions insert own" on public.versions for insert with check (user_id = auth.uid());

-- consents: append-only for the user, readable, deletable with "delete my data".
create policy "consents select own" on public.consents for select using (user_id = auth.uid());
create policy "consents insert own" on public.consents for insert with check (user_id = auth.uid());
create policy "consents delete own" on public.consents for delete using (user_id = auth.uid());
