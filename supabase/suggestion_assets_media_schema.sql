alter table public.suggestion_assets
  alter column mime_type set default 'image/svg+xml';

alter table public.suggestion_assets
  drop constraint if exists suggestion_assets_mime_type_check;

alter table public.suggestion_assets
  add constraint suggestion_assets_mime_type_check
  check (mime_type in ('image/svg+xml', 'image/png', 'image/jpeg'));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'suggestion-assets',
  'suggestion-assets',
  true,
  409600,
  array['image/svg+xml', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set public = true,
    file_size_limit = 409600,
    allowed_mime_types = array['image/svg+xml', 'image/png', 'image/jpeg'];

create or replace function public.enforce_suggestion_asset_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  suggestion_owner_id uuid;
  asset_count integer;
begin
  select member_id
  into suggestion_owner_id
  from public.suggestions
  where id = new.suggestion_id;

  if suggestion_owner_id is null then
    raise exception 'Logo yuklenecek oneri bulunamadi.';
  end if;

  if new.member_id <> suggestion_owner_id then
    raise exception 'Gorsel dosyasini sadece oneriyi ekleyen uye yukleyebilir.';
  end if;

  if tg_op = 'INSERT' then
    select count(*)
    into asset_count
    from public.suggestion_assets
    where suggestion_id = new.suggestion_id;

    if asset_count >= 3 then
      raise exception 'Her oneri icin en fazla 3 gorsel yuklenebilir.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.insert_suggestion_asset(
  suggestion_id_input uuid,
  storage_path_input text,
  mime_type_input text default 'image/svg+xml'
)
returns public.suggestion_assets
language plpgsql
security definer
set search_path = public
as $$
declare
  suggestion_owner_id uuid;
  asset_row public.suggestion_assets;
begin
  if auth.uid() is null then
    raise exception 'Gecerli bir oturum bulunamadi.';
  end if;

  if not (
    public.current_profile_is_approved()
    or public.current_profile_role() = 'admin'
  ) then
    raise exception 'Bu islem icin yetkin bulunmuyor.';
  end if;

  select member_id
  into suggestion_owner_id
  from public.suggestions
  where id = suggestion_id_input;

  if suggestion_owner_id is null then
    raise exception 'Logo yuklenecek oneri bulunamadi.';
  end if;

  if suggestion_owner_id <> auth.uid() then
    raise exception 'Gorsel dosyasini sadece oneriyi ekleyen uye yukleyebilir.';
  end if;

  insert into public.suggestion_assets (
    suggestion_id,
    member_id,
    storage_path,
    mime_type
  )
  values (
    suggestion_id_input,
    auth.uid(),
    storage_path_input,
    coalesce(nullif(trim(mime_type_input), ''), 'image/svg+xml')
  )
  returning * into asset_row;

  return asset_row;
end;
$$;

create or replace function public.remove_suggestion_asset(
  asset_id_input uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  asset_row public.suggestion_assets;
begin
  if auth.uid() is null then
    raise exception 'Gecerli bir oturum bulunamadi.';
  end if;

  select *
  into asset_row
  from public.suggestion_assets
  where id = asset_id_input;

  if not found then
    raise exception 'Silinecek gorsel kaydi bulunamadi.';
  end if;

  if asset_row.member_id <> auth.uid() and public.current_profile_role() <> 'admin' then
    raise exception 'Bu gorsel kaydini silme yetkin yok.';
  end if;

  delete from public.suggestion_assets
  where id = asset_id_input;

  return asset_row.storage_path;
end;
$$;

notify pgrst, 'reload schema';
