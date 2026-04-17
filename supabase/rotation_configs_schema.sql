create table if not exists public.rotation_configs (
  id text primary key default 'default'
);

alter table public.rotation_configs
  add column if not exists base_start_order jsonb not null default '{}'::jsonb;

alter table public.rotation_configs
  add column if not exists zone_positions jsonb not null default '{}'::jsonb;

alter table public.rotation_configs
  add column if not exists frames jsonb not null default '[]'::jsonb;

alter table public.rotation_configs
  add column if not exists updated_at timestamptz not null default now();

alter table public.rotation_configs
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.rotation_configs enable row level security;

drop policy if exists "approved users can read rotation configs" on public.rotation_configs;
create policy "approved users can read rotation configs"
on public.rotation_configs
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

drop policy if exists "admins can insert rotation configs" on public.rotation_configs;
create policy "admins can insert rotation configs"
on public.rotation_configs
for insert
to authenticated
with check (
  public.current_profile_role() = 'admin'
  and public.current_profile_session_is_active()
);

drop policy if exists "admins can update rotation configs" on public.rotation_configs;
create policy "admins can update rotation configs"
on public.rotation_configs
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

grant select, insert, update on public.rotation_configs to authenticated;

notify pgrst, 'reload schema';
