create extension if not exists pgcrypto;

create table if not exists public.youtube_video_entries (
  id uuid primary key default gen_random_uuid(),
  video_date date not null,
  url text not null check (url ~* '^https?://'),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists youtube_video_entries_video_date_idx
  on public.youtube_video_entries (video_date desc, created_at desc);

alter table public.youtube_video_entries enable row level security;

drop policy if exists "approved users can read youtube video entries" on public.youtube_video_entries;
create policy "approved users can read youtube video entries"
on public.youtube_video_entries
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

drop policy if exists "approved users can insert youtube video entries" on public.youtube_video_entries;
create policy "approved users can insert youtube video entries"
on public.youtube_video_entries
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

drop policy if exists "admins can delete youtube video entries" on public.youtube_video_entries;
create policy "admins can delete youtube video entries"
on public.youtube_video_entries
for delete
to authenticated
using (
  public.current_profile_role() = 'admin'
  and public.current_profile_session_is_active()
);

grant select, insert, delete on public.youtube_video_entries to authenticated;

notify pgrst, 'reload schema';
