-- Add user_pin_credentials table for admin PIN (separate from password auth)
-- This table is referenced by the setup-admin-pin edge function.
-- It is NOT used for regular user authentication — users authenticate with
-- username + password via Supabase Auth. The admin PIN is an optional
-- additional verification mechanism for admin-level actions.
--
-- Run this on your original Supabase project (prpumqntmtocznwdoehh)
-- via the SQL Editor in the Supabase Dashboard.
-- Do NOT run on the Bolt Supabase instance.

create table if not exists public.user_pin_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_pin_credentials enable row level security;

-- No policies for anon or authenticated roles: only the service role
-- (used by edge functions) can read or write this table. This keeps
-- PIN hashes completely inaccessible from the client side.

create or replace trigger set_updated_at_pin_credentials
  before update on public.user_pin_credentials
  for each row execute function public.set_updated_at();
