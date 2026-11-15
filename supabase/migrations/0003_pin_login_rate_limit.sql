-- Rate-limit PIN login attempts by username and source IP.
-- Raw usernames and IP addresses are never stored in this table.
create table if not exists public.pin_login_attempts (
  bucket_key text primary key,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists pin_login_attempts_updated_at_idx
  on public.pin_login_attempts (updated_at);

alter table public.pin_login_attempts enable row level security;
revoke all on table public.pin_login_attempts from public, anon, authenticated;
grant all on table public.pin_login_attempts to service_role;

create or replace function public.consume_pin_login_attempt(
  p_username text,
  p_client_ip text
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username_key text;
  v_ip_key text;
  v_key text;
  v_limit integer;
  v_count integer;
  v_window timestamptz;
  v_locked_until timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  if coalesce(trim(p_username), '') = '' then
    return query select false, 900;
    return;
  end if;

  v_username_key := encode(
    digest('username:' || lower(trim(p_username)), 'sha256'),
    'hex'
  );
  v_ip_key := encode(
    digest('ip:' || coalesce(nullif(trim(p_client_ip), ''), 'unknown'), 'sha256'),
    'hex'
  );

  -- Always enforce the username bucket. Enforce the IP bucket only when
  -- the edge gateway supplied a real source address.
  -- Lock buckets in a stable order to avoid deadlocks.
  for v_key, v_limit in
    select bucket_key, max_attempts
    from (
      values
        (v_username_key, 5, true),
        (v_ip_key, 20, coalesce(nullif(trim(p_client_ip), ''), 'unknown') <> 'unknown')
    ) as buckets(bucket_key, max_attempts, enabled)
    where enabled
    order by bucket_key
  loop
    perform pg_advisory_xact_lock(hashtext(v_key));

    insert into public.pin_login_attempts (bucket_key)
    values (v_key)
    on conflict (bucket_key) do nothing;

    select attempt_count, window_started_at, locked_until
      into v_count, v_window, v_locked_until
    from public.pin_login_attempts
    where bucket_key = v_key
    for update;

    if v_locked_until is not null and v_locked_until > v_now then
      return query
      select false, greatest(1, ceil(extract(epoch from (v_locked_until - v_now)))::integer);
      return;
    end if;

    if v_window < v_now - interval '15 minutes' then
      v_count := 0;
      v_window := v_now;
      v_locked_until := null;
    end if;

    v_count := v_count + 1;

    if v_count > v_limit then
      v_locked_until := v_now + interval '15 minutes';
      update public.pin_login_attempts
      set attempt_count = v_count,
          window_started_at = v_window,
          locked_until = v_locked_until,
          updated_at = v_now
      where bucket_key = v_key;

      return query select false, 900;
      return;
    end if;

    update public.pin_login_attempts
    set attempt_count = v_count,
        window_started_at = v_window,
        locked_until = null,
        updated_at = v_now
    where bucket_key = v_key;
  end loop;

  return query select true, 0;
end;
$$;

create or replace function public.reset_pin_login_attempt(
  p_username text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username_key text;
begin
  if coalesce(trim(p_username), '') = '' then
    return;
  end if;

  v_username_key := encode(
    digest('username:' || lower(trim(p_username)), 'sha256'),
    'hex'
  );

  delete from public.pin_login_attempts
  where bucket_key = v_username_key;
end;
$$;

revoke all on function public.consume_pin_login_attempt(text, text) from public, anon, authenticated;
revoke all on function public.reset_pin_login_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_pin_login_attempt(text, text) to service_role;
grant execute on function public.reset_pin_login_attempt(text) to service_role;
