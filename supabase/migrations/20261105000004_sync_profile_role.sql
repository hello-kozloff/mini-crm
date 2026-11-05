-- Supabase Auth writes app_metadata after the initial insert into auth.users,
-- so the role must also be synced on update. app_metadata is writable only by
-- the service role (admin), never by the user.

create function private.handle_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set role = (new.raw_app_meta_data ->> 'role')::public.app_role
  where id = new.id
    and new.raw_app_meta_data ->> 'role' is not null;
  return new;
end;
$$;

create trigger on_auth_user_role_changed
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data ->> 'role' is distinct from new.raw_app_meta_data ->> 'role')
  execute function private.handle_user_role_change();

-- Backfill users created before this migration.
update public.profiles p
set role = (u.raw_app_meta_data ->> 'role')::public.app_role
from auth.users u
where u.id = p.id
  and u.raw_app_meta_data ->> 'role' is not null;
