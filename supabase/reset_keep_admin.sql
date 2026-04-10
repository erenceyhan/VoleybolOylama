do $$
declare
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from public.profiles
  where username = 'erenceyhan'
    and role = 'admin'
  limit 1;

  if admin_user_id is null then
    raise exception 'Admin profili bulunamadi. Islem iptal edildi.';
  end if;

  -- Tum uygulama icerigini temizle.
  delete from public.comments;
  delete from public.votes;
  delete from public.suggestions;

  -- Admin disindaki tum profilleri kaldir.
  delete from public.profiles
  where id <> admin_user_id;

  -- Admin disindaki tum Auth hesaplarini kaldir.
  delete from auth.users
  where id <> admin_user_id;

  -- Admin kaydini garantiye al.
  update public.profiles
  set username = 'erenceyhan',
      display_name = 'erenceyhan',
      role = 'admin',
      approved = true,
      approved_at = coalesce(approved_at, now()),
      approved_by = null
  where id = admin_user_id;
end $$;
