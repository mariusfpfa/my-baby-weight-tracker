create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-zA-Z0-9_-]{3,32}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null default 'Device',
  public_key jsonb not null,
  approved boolean not null default false,
  owner boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  last_seen_at timestamptz
);

create table if not exists public.device_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  device_name text not null default 'New device',
  public_key jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  code text not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_device_id uuid references public.devices(id) on delete set null
);

create table if not exists public.sessions (
  token_hash text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz
);

create table if not exists public.baby_profiles (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  name text default '',
  birth_date date,
  gender text not null default 'boy' check (gender in ('boy','girl')),
  unit text not null default 'kg' check (unit in ('kg','lbs')),
  range_weeks int not null default 13,
  updated_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 30),
  age_weeks numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, measured_on)
);

create index if not exists devices_account_idx on public.devices(account_id);
create index if not exists device_requests_account_status_idx on public.device_requests(account_id, status, created_at desc);
create index if not exists sessions_device_idx on public.sessions(device_id);
create index if not exists measurements_account_date_idx on public.measurements(account_id, measured_on);

alter table public.accounts enable row level security;
alter table public.devices enable row level security;
alter table public.device_requests enable row level security;
alter table public.sessions enable row level security;
alter table public.baby_profiles enable row level security;
alter table public.measurements enable row level security;

-- All access is mediated by the Edge Function with the service role key.
-- No direct anon/authenticated table access is granted.
