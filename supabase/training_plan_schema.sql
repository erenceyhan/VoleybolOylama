create extension if not exists pgcrypto;

create table if not exists public.training_plan_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 600),
  match_link text,
  match_source text,
  event_type text not null default 'training' check (event_type in ('training', 'match')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  possible_days text[] not null default '{}'::text[],
  possible_hours text[] not null default '{}'::text[],
  is_locked boolean not null default false,
  locked_day text,
  locked_hour text,
  created_at timestamptz not null default now(),
  constraint training_plan_events_lock_check check (
    (is_locked = false and locked_day is null and locked_hour is null)
    or (is_locked = true and locked_day is not null and locked_hour is not null)
  )
);

alter table public.training_plan_events
  add column if not exists match_link text;

alter table public.training_plan_events
  add column if not exists match_source text;

create table if not exists public.training_plan_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.training_plan_events (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('yes', 'maybe', 'no')),
  selected_days text[] not null default '{}'::text[],
  selected_hours text[] not null default '{}'::text[],
  note text not null default '' check (char_length(note) <= 400),
  updated_at timestamptz not null default now(),
  unique (event_id, member_id)
);

create table if not exists public.training_plan_settings (
  id text primary key default 'default',
  voleyboloyna_link text,
  amator_match_program_link text,
  training_school_links jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.training_plan_settings
  add column if not exists amator_match_program_link text;

alter table public.training_plan_settings
  add column if not exists training_school_links jsonb not null default '[]'::jsonb;

create index if not exists training_plan_events_created_at_idx
  on public.training_plan_events (created_at desc);

create index if not exists training_plan_responses_event_id_updated_at_idx
  on public.training_plan_responses (event_id, updated_at desc);

create index if not exists training_plan_responses_member_id_updated_at_idx
  on public.training_plan_responses (member_id, updated_at desc);

alter table public.training_plan_events enable row level security;
alter table public.training_plan_responses enable row level security;
alter table public.training_plan_settings enable row level security;

drop policy if exists "approved users can read training plan events" on public.training_plan_events;
create policy "approved users can read training plan events"
on public.training_plan_events
for select
to authenticated
using (
  (
    public.current_profile_is_approved()
    and public.current_profile_session_is_active()
  )
  or (
    public.current_profile_role() = 'admin'
    and public.current_profile_session_is_active()
  )
);

drop policy if exists "approved users can insert own training plan events" on public.training_plan_events;
create policy "approved users can insert own training plan events"
on public.training_plan_events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.current_profile_is_approved()
    or public.current_profile_role() = 'admin'
  )
  and public.current_profile_session_is_active()
);

drop policy if exists "owners or admins can update training plan events" on public.training_plan_events;
create policy "owners or admins can update training plan events"
on public.training_plan_events
for update
to authenticated
using (
  (
    created_by = auth.uid()
    or public.current_profile_role() = 'admin'
  )
  and public.current_profile_session_is_active()
)
with check (
  (
    created_by = auth.uid()
    or public.current_profile_role() = 'admin'
  )
  and public.current_profile_session_is_active()
);

drop policy if exists "owners or admins can delete training plan events" on public.training_plan_events;
create policy "owners or admins can delete training plan events"
on public.training_plan_events
for delete
to authenticated
using (
  (
    created_by = auth.uid()
    or public.current_profile_role() = 'admin'
  )
  and public.current_profile_session_is_active()
);

drop policy if exists "approved users can read training plan responses" on public.training_plan_responses;
create policy "approved users can read training plan responses"
on public.training_plan_responses
for select
to authenticated
using (
  (
    public.current_profile_is_approved()
    and public.current_profile_session_is_active()
  )
  or (
    public.current_profile_role() = 'admin'
    and public.current_profile_session_is_active()
  )
);

drop policy if exists "users can insert own training plan responses" on public.training_plan_responses;
create policy "users can insert own training plan responses"
on public.training_plan_responses
for insert
to authenticated
with check (
  member_id = auth.uid()
  and public.current_profile_is_approved()
  and public.current_profile_session_is_active()
);

drop policy if exists "users can update own training plan responses" on public.training_plan_responses;
create policy "users can update own training plan responses"
on public.training_plan_responses
for update
to authenticated
using (
  member_id = auth.uid()
  and public.current_profile_session_is_active()
)
with check (
  member_id = auth.uid()
  and public.current_profile_session_is_active()
);

drop policy if exists "users or admins can delete training plan responses" on public.training_plan_responses;
create policy "users or admins can delete training plan responses"
on public.training_plan_responses
for delete
to authenticated
using (
  (
    member_id = auth.uid()
    or public.current_profile_role() = 'admin'
  )
  and public.current_profile_session_is_active()
);

drop policy if exists "approved users can read training plan settings" on public.training_plan_settings;
create policy "approved users can read training plan settings"
on public.training_plan_settings
for select
to authenticated
using (
  (
    public.current_profile_is_approved()
    and public.current_profile_session_is_active()
  )
  or (
    public.current_profile_role() = 'admin'
    and public.current_profile_session_is_active()
  )
);

drop policy if exists "admins can insert training plan settings" on public.training_plan_settings;
create policy "admins can insert training plan settings"
on public.training_plan_settings
for insert
to authenticated
with check (
  public.current_profile_role() = 'admin'
  and public.current_profile_session_is_active()
);

drop policy if exists "admins can update training plan settings" on public.training_plan_settings;
create policy "admins can update training plan settings"
on public.training_plan_settings
for update
to authenticated
using (
  public.current_profile_role() = 'admin'
  and public.current_profile_session_is_active()
)
with check (
  public.current_profile_role() = 'admin'
  and public.current_profile_session_is_active()
);

grant select, insert, update, delete on public.training_plan_events to authenticated;
grant select, insert, update, delete on public.training_plan_responses to authenticated;
grant select, insert, update on public.training_plan_settings to authenticated;
