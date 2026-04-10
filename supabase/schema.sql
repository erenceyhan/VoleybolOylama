create extension if not exists pgcrypto;

drop table if exists public.member_invites cascade;
drop function if exists public.claim_invite(text, text);
drop function if exists public.enforce_invite_limit();

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,24}$'),
  display_name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  approved boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists approved boolean not null default false;

alter table public.profiles
  add column if not exists approved_at timestamptz;

alter table public.profiles
  add column if not exists approved_by uuid references public.profiles (id) on delete set null;

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 40),
  note text not null default '',
  member_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  member_id uuid not null references public.profiles (id) on delete cascade,
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  value integer not null check (value between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (member_id, suggestion_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 200),
  created_at timestamptz not null default now()
);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'guest');
$$;

create or replace function public.current_profile_is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.enforce_suggestion_limit()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.suggestions
    where member_id = new.member_id
  ) >= 3 then
    raise exception 'Her uye en fazla 3 oneride bulunabilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists suggestion_limit_trigger on public.suggestions;
create trigger suggestion_limit_trigger
before insert on public.suggestions
for each row
execute function public.enforce_suggestion_limit();

create or replace function public.enforce_no_self_vote()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  suggestion_owner_id uuid;
begin
  select member_id
  into suggestion_owner_id
  from public.suggestions
  where id = new.suggestion_id;

  if suggestion_owner_id is null then
    raise exception 'Oylanacak oneri bulunamadi.';
  end if;

  if suggestion_owner_id = new.member_id then
    raise exception 'Kendi onerine puan veremezsin.';
  end if;

  return new;
end;
$$;

drop trigger if exists no_self_vote_trigger on public.votes;
create trigger no_self_vote_trigger
before insert or update on public.votes
for each row
execute function public.enforce_no_self_vote();

delete from public.votes
using public.suggestions
where public.votes.suggestion_id = public.suggestions.id
  and public.votes.member_id = public.suggestions.member_id;

create or replace function public.complete_signup(
  display_name_input text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_username text;
  existing_profile public.profiles;
  next_role text;
  next_approved boolean;
  profile_row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Gecerli bir oturum bulunamadi.';
  end if;

  select *
  into existing_profile
  from public.profiles
  where id = auth.uid();

  if found then
    return existing_profile;
  end if;

  normalized_username := lower(trim(coalesce(auth.jwt()->'user_metadata'->>'username', '')));

  if normalized_username = '' then
    raise exception 'Kullanici adi bulunamadi.';
  end if;

  next_role := case
    when normalized_username = 'erenceyhan'
      and not exists (
        select 1
        from public.profiles
        where role = 'admin'
      )
    then 'admin'
    else 'member'
  end;

  next_approved := next_role = 'admin';

  insert into public.profiles (
    id,
    username,
    display_name,
    role,
    approved,
    approved_at
  )
  values (
    auth.uid(),
    normalized_username,
    coalesce(nullif(trim(display_name_input), ''), normalized_username),
    next_role,
    next_approved,
    case when next_approved then now() else null end
  )
  returning * into profile_row;

  return profile_row;
end;
$$;

create or replace function public.admin_set_member_approval(
  member_id_input uuid,
  approved_input boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Gecerli bir oturum bulunamadi.';
  end if;

  if public.current_profile_role() <> 'admin' then
    raise exception 'Bu islem sadece admin tarafindan yapilabilir.';
  end if;

  update public.profiles
  set approved = approved_input,
      approved_at = case when approved_input then coalesce(approved_at, now()) else null end,
      approved_by = case when approved_input then auth.uid() else null end
  where id = member_id_input
  returning * into profile_row;

  if not found then
    raise exception 'Onaylanacak uye bulunamadi.';
  end if;

  return profile_row;
end;
$$;

create or replace function public.admin_reject_member(
  member_id_input uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Gecerli bir oturum bulunamadi.';
  end if;

  if public.current_profile_role() <> 'admin' then
    raise exception 'Bu islem sadece admin tarafindan yapilabilir.';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = member_id_input;

  if not found then
    raise exception 'Reddedilecek uye bulunamadi.';
  end if;

  if target_profile.id = auth.uid() then
    raise exception 'Kendi hesabini reddedemezsin.';
  end if;

  if target_profile.role = 'admin' then
    raise exception 'Admin hesabi reddedilemez.';
  end if;

  delete from auth.users
  where id = member_id_input;

  if not found then
    delete from public.profiles
    where id = member_id_input;

    if not found then
      raise exception 'Silinecek uye bulunamadi.';
    end if;
  end if;

  return member_id_input;
end;
$$;

alter table public.profiles enable row level security;
alter table public.suggestions enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;

drop policy if exists "profiles can be read by approved users or admins" on public.profiles;
create policy "profiles can be read by approved users or admins"
on public.profiles
for select
to authenticated
using (
  (approved = true and public.current_profile_is_approved())
  or id = auth.uid()
  or public.current_profile_role() = 'admin'
);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "approved users can read suggestions" on public.suggestions;
create policy "approved users can read suggestions"
on public.suggestions
for select
to authenticated
using (
  public.current_profile_is_approved()
  or public.current_profile_role() = 'admin'
);

drop policy if exists "approved users can insert suggestions" on public.suggestions;
create policy "approved users can insert suggestions"
on public.suggestions
for insert
to authenticated
with check (
  member_id = auth.uid()
  and public.current_profile_is_approved()
);

drop policy if exists "owners or admins can update suggestions" on public.suggestions;
drop policy if exists "owners can update suggestions" on public.suggestions;
create policy "owners can update suggestions"
on public.suggestions
for update
to authenticated
using (member_id = auth.uid())
with check (member_id = auth.uid());

drop policy if exists "owners or admins can delete suggestions" on public.suggestions;
create policy "owners or admins can delete suggestions"
on public.suggestions
for delete
to authenticated
using (member_id = auth.uid() or public.current_profile_role() = 'admin');

drop policy if exists "approved users can read votes" on public.votes;
create policy "approved users can read votes"
on public.votes
for select
to authenticated
using (
  public.current_profile_is_approved()
  or public.current_profile_role() = 'admin'
);

drop policy if exists "users can insert own votes" on public.votes;
create policy "users can insert own votes"
on public.votes
for insert
to authenticated
with check (
  member_id = auth.uid()
  and public.current_profile_is_approved()
);

drop policy if exists "users can update own votes" on public.votes;
create policy "users can update own votes"
on public.votes
for update
to authenticated
using (member_id = auth.uid())
with check (member_id = auth.uid());

drop policy if exists "users can delete own votes" on public.votes;
create policy "users can delete own votes"
on public.votes
for delete
to authenticated
using (member_id = auth.uid());

drop policy if exists "approved users can read comments" on public.comments;
create policy "approved users can read comments"
on public.comments
for select
to authenticated
using (
  public.current_profile_is_approved()
  or public.current_profile_role() = 'admin'
);

drop policy if exists "users can insert own comments" on public.comments;
create policy "users can insert own comments"
on public.comments
for insert
to authenticated
with check (
  member_id = auth.uid()
  and public.current_profile_is_approved()
);

drop policy if exists "owners or admins can delete comments" on public.comments;
create policy "owners or admins can delete comments"
on public.comments
for delete
to authenticated
using (member_id = auth.uid() or public.current_profile_role() = 'admin');

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.suggestions to authenticated;
grant select, insert, update, delete on public.votes to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_is_approved() to authenticated;
grant execute on function public.complete_signup(text) to authenticated;
grant execute on function public.admin_set_member_approval(uuid, boolean) to authenticated;
grant execute on function public.admin_reject_member(uuid) to authenticated;
