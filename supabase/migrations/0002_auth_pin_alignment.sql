alter table public.profiles
  add column if not exists job_title text;

create table if not exists public.user_pin_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_pin_credentials enable row level security;
revoke all on table public.user_pin_credentials from anon, authenticated;
grant all on table public.user_pin_credentials to service_role;
