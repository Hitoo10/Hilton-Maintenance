-- ShiftFlow Maintenance schema
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  username text not null unique,
  normalized_username text not null unique,
  role text not null default 'technician' check (role in ('admin','technician')),
  status text not null default 'pending' check (status in ('pending','active','disabled')),
  avatar_url text,
  current_shift_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_lower_uidx on public.profiles (lower(username));
create index profiles_team_idx on public.profiles(team_id);

create table public.invitation_codes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  code text not null unique,
  created_by uuid references public.profiles(id),
  max_uses int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(team_id, name)
);

alter table public.profiles
  add constraint profiles_current_shift_fk foreign key (current_shift_id) references public.shifts(id) on delete set null;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text not null default '',
  location text not null,
  room_number text,
  floor text,
  department text,
  equipment_type text,
  category text not null check (category in ('HVAC','Electrical','Plumbing','Cold Rooms','Freezing Rooms','Chillers','Refrigeration','General')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  status text not null default 'New' check (status in ('New','In Progress','Pending','Completed')),
  assigned_to uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  shift_id uuid references public.shifts(id),
  handover_notes text not null default '',
  completion_notes text not null default '',
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index tasks_team_status_idx on public.tasks(team_id, status);
create index tasks_team_priority_idx on public.tasks(team_id, priority);
create index tasks_assigned_idx on public.tasks(assigned_to);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments(task_id);

create table public.task_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  previous jsonb,
  next jsonb,
  created_at timestamptz not null default now()
);
create index task_history_task_idx on public.task_history(task_id, created_at desc);

create table public.critical_alerts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'Open' check (status in ('Open','Escalated','Resolved')),
  assigned_to uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  resolution_notes text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index critical_alerts_team_status_idx on public.critical_alerts(team_id, status);

create table public.handovers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  outgoing_user_id uuid not null references public.profiles(id),
  incoming_user_id uuid references public.profiles(id),
  previous_shift_id uuid references public.shifts(id),
  new_shift_id uuid references public.shifts(id),
  handover_notes text not null default '',
  status text not null default 'Submitted' check (status in ('Submitted','Confirmed','Rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index handovers_team_idx on public.handovers(team_id, submitted_at desc);

create table public.handover_tasks (
  handover_id uuid not null references public.handovers(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  requires_immediate_attention boolean not null default false,
  primary key(handover_id, task_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null check (type in ('group','private')),
  title text,
  task_id uuid references public.tasks(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index conversations_one_group_per_team
  on public.conversations(team_id) where type = 'group';

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key(conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null default '',
  image_url text,
  reply_to uuid references public.messages(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index messages_conversation_idx on public.messages(conversation_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  task_id uuid references public.tasks(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, read_at, created_at desc);

create table public.push_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  team_id uuid references public.teams(id) on delete set null,
  user_id uuid references public.profiles(id),
  username text,
  action text not null,
  task_id uuid,
  previous jsonb,
  next jsonb,
  description text not null default '',
  created_at timestamptz not null default now()
);
create index audit_team_time_idx on public.audit_logs(team_id, created_at desc);
create index audit_action_idx on public.audit_logs(action);

create or replace function public.audit_event()
returns trigger
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  uname text;
  record_id uuid;
  record_team_id uuid;
  old_data jsonb;
  new_data jsonb;
begin
  if TG_OP <> 'INSERT' then
    old_data := to_jsonb(old);
  end if;

  if TG_OP <> 'DELETE' then
    new_data := to_jsonb(new);
  end if;

  record_id := coalesce(
    (new_data ->> 'id')::uuid,
    (old_data ->> 'id')::uuid
  );

  if TG_TABLE_NAME = 'messages' then
    select c.team_id into record_team_id
    from public.conversations c
    where c.id = coalesce(
      (new_data ->> 'conversation_id')::uuid,
      (old_data ->> 'conversation_id')::uuid
    );
  else
    record_team_id := coalesce(
      (new_data ->> 'team_id')::uuid,
      (old_data ->> 'team_id')::uuid
    );
  end if;

  select username into uname
  from public.profiles
  where id = actor;

  insert into public.audit_logs (
    team_id, user_id, username, action,
    task_id, previous, next, description
  )
  values (
    record_team_id, actor, uname, TG_ARGV[0],
    case when TG_TABLE_NAME = 'tasks' then record_id else null end,
    old_data, new_data, TG_ARGV[0]
  );

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_audit on public.tasks;
create trigger tasks_audit after insert or update or delete on public.tasks
for each row execute function public.audit_event('task_change');

drop trigger if exists handovers_audit on public.handovers;
create trigger handovers_audit after insert or update on public.handovers
for each row execute function public.audit_event('handover_change');

drop trigger if exists messages_audit on public.messages;
create trigger messages_audit after insert on public.messages
for each row execute function public.audit_event('chat_message');

drop trigger if exists critical_alerts_audit on public.critical_alerts;
create trigger critical_alerts_audit after insert or update on public.critical_alerts
for each row execute function public.audit_event('critical_alert_change');

alter table public.profiles enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.shifts enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_history enable row level security;
alter table public.critical_alerts enable row level security;
alter table public.handovers enable row level security;
alter table public.handover_tasks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_active_member(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.team_id = tid
      and p.status = 'active'
  )
$$;

create or replace function public.is_admin(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.team_id = tid
      and p.role = 'admin'
      and p.status = 'active'
  )
$$;

create or replace function public.my_team()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.profiles where id = auth.uid()
$$;

create policy "profiles read team" on public.profiles for select using (team_id = public.my_team() and public.is_active_member(team_id));
create or replace function public.can_update_own_profile(
  new_team_id uuid,
  new_role text,
  new_status text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.team_id is not distinct from new_team_id
      and p.role = new_role
      and p.status = new_status
      and p.status = 'active'
  )
$$;

create policy "profiles update self"
on public.profiles
for update
using (id = auth.uid() and status = 'active')
with check (
  id = auth.uid()
  and public.can_update_own_profile(team_id, role, status)
);
create policy "admin manage profiles" on public.profiles for all using (public.is_admin(team_id)) with check (public.is_admin(team_id));

create policy "invitation admin" on public.invitation_codes for all using (public.is_admin(team_id)) with check (public.is_admin(team_id));

create policy "shifts read team" on public.shifts for select using (public.is_active_member(team_id));
create policy "shifts admin write" on public.shifts for all using (public.is_admin(team_id)) with check (public.is_admin(team_id));

create policy "tasks team read" on public.tasks for select using (public.is_active_member(team_id));
create policy "tasks team insert" on public.tasks for insert with check (public.is_active_member(team_id) and created_by = auth.uid() and (assigned_to is null or public.is_active_member(team_id)));
create policy "tasks team update" on public.tasks for update using (public.is_active_member(team_id)) with check (public.is_active_member(team_id));
create policy "tasks no delete" on public.tasks for delete using (public.is_admin(team_id));

create policy "comments read" on public.task_comments for select using (exists(select 1 from public.tasks t where t.id = task_id and public.is_active_member(t.team_id)));
create policy "comments insert" on public.task_comments for insert with check (user_id = auth.uid() and exists(select 1 from public.tasks t where t.id = task_id and public.is_active_member(t.team_id)));

create policy "history read" on public.task_history for select using (exists(select 1 from public.tasks t where t.id = task_id and public.is_active_member(t.team_id)));

create policy "alerts team" on public.critical_alerts for select using (public.is_active_member(team_id));
create policy "alerts insert" on public.critical_alerts for insert with check (public.is_active_member(team_id) and created_by = auth.uid());
create policy "alerts update" on public.critical_alerts for update using (public.is_active_member(team_id)) with check (public.is_active_member(team_id));

create policy "handover team read" on public.handovers for select using (public.is_active_member(team_id));
create policy "handover insert" on public.handovers for insert with check (public.is_active_member(team_id) and outgoing_user_id = auth.uid());
create policy "handover confirm" on public.handovers for update using (public.is_active_member(team_id) and (incoming_user_id = auth.uid() or public.is_admin(team_id))) with check (public.is_active_member(team_id));

create policy "handover_tasks read" on public.handover_tasks for select using (exists(select 1 from public.handovers h where h.id = handover_id and public.is_active_member(h.team_id)));
create policy "handover_tasks insert" on public.handover_tasks for insert with check (exists(select 1 from public.handovers h where h.id = handover_id and h.outgoing_user_id = auth.uid()));

create policy "conv read" on public.conversations for select using (public.is_active_member(team_id));
create policy "conv insert" on public.conversations for insert with check (public.is_active_member(team_id));
create policy "members read" on public.conversation_members for select using (exists(select 1 from public.conversations c where c.id = conversation_id and public.is_active_member(c.team_id)));
create policy "members insert" on public.conversation_members for insert with check (exists(select 1 from public.conversations c where c.id = conversation_id and public.is_active_member(c.team_id)));

create policy "messages read" on public.messages for select using (exists(select 1 from public.conversations c where c.id = conversation_id and public.is_active_member(c.team_id)));
create policy "messages insert" on public.messages for insert with check (sender_id = auth.uid() and exists(select 1 from public.conversations c where c.id = conversation_id and public.is_active_member(c.team_id)));

create policy "notif own" on public.notifications for select using (user_id = auth.uid());
create policy "notif own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "push own" on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "audit admin read" on public.audit_logs for select using (public.is_admin(team_id));
-- no insert/update/delete policies for technicians: audit is append-only via trigger/service role

insert into storage.buckets (id, name, public) values ('task-images','task-images', false), ('chat-images','chat-images', false), ('avatars','avatars', false)
on conflict (id) do nothing;
