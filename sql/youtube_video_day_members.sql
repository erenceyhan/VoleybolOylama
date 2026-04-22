create table if not exists public.youtube_video_day_members (
  id uuid primary key default gen_random_uuid(),
  video_date date not null,
  member_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  unique (video_date, member_id)
);

alter table public.youtube_video_day_members enable row level security;

drop policy if exists "approved users can read youtube video day members" on public.youtube_video_day_members;
create policy "approved users can read youtube video day members"
on public.youtube_video_day_members
for select
to authenticated
using (
  public.current_profile_is_approved()
  or public.current_profile_role() = 'admin'
);

drop policy if exists "approved users can insert youtube video day members" on public.youtube_video_day_members;
create policy "approved users can insert youtube video day members"
on public.youtube_video_day_members
for insert
to authenticated
with check (
  (
    public.current_profile_is_approved()
    or public.current_profile_role() = 'admin'
  )
  and created_by = auth.uid()
);

drop policy if exists "admins can delete youtube video day members" on public.youtube_video_day_members;
create policy "admins can delete youtube video day members"
on public.youtube_video_day_members
for delete
to authenticated
using (public.current_profile_role() = 'admin');

grant select, insert, delete on public.youtube_video_day_members to authenticated;
