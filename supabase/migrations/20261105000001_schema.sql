-- Schema: roles, objects (construction sites), tasks, status history.
-- Helper/trigger functions live in the `private` schema, which is not exposed via the Data API.

create schema if not exists private;

create type public.app_role as enum ('manager', 'executor');
create type public.task_status as enum ('new', 'in_progress', 'review', 'accepted', 'rework');

-- Profiles ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.app_role not null
);

-- Profile is created automatically for every auth user.
-- Role comes from app_metadata, which only the service role can set (users cannot edit it).
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), new.email),
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'executor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Objects -------------------------------------------------------------------

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  address text not null check (btrim(address) <> ''),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Tasks ---------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id) on delete restrict,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  assignee_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  author_id uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

-- Task status history (append-only) ----------------------------------------

create table public.task_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  from_status public.task_status,
  to_status public.task_status not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint rework_requires_comment
    check (to_status <> 'rework' or btrim(coalesce(comment, '')) <> '')
);

create index task_history_task_id_idx on public.task_history (task_id);

-- Task triggers -------------------------------------------------------------

-- New tasks always start as 'new'; author and creation time cannot be forged.
-- auth.uid() is null only for trusted server-side inserts (SQL editor / service role).
create function private.tasks_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'new';
  new.author_id := coalesce(auth.uid(), new.author_id);
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_before_insert
  before insert on public.tasks
  for each row execute function private.tasks_before_insert();

-- Assignee must be a user with the executor role.
create function private.tasks_check_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.assignee_id and role = 'executor'
  ) then
    raise exception 'Исполнителем можно назначить только пользователя с ролью «исполнитель»'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger tasks_check_assignee
  before insert or update of assignee_id on public.tasks
  for each row execute function private.tasks_check_assignee();

-- Status may change only inside public.change_task_status() (it sets app.via_rpc).
-- Immutable columns are pinned to their old values.
create function private.tasks_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.via_rpc', true), '') <> 'on' then
    raise exception 'Статус меняется только через действия над задачей'
      using errcode = '42501';
  end if;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_before_update
  before update on public.tasks
  for each row execute function private.tasks_before_update();

-- Creation is the first history entry: — → new.
create function private.tasks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_history (task_id, actor_id, from_status, to_status)
  values (new.id, new.author_id, null, new.status);
  return new;
end;
$$;

create trigger tasks_after_insert
  after insert on public.tasks
  for each row execute function private.tasks_after_insert();

-- History is append-only: no updates at all; deletes only via cascade when the task itself is deleted.
create function private.task_history_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and not exists (select 1 from public.tasks where id = old.task_id) then
    return old;
  end if;
  raise exception 'История статусов не может быть изменена или удалена'
    using errcode = '42501';
end;
$$;

create trigger task_history_immutable
  before update or delete on public.task_history
  for each row execute function private.task_history_immutable();
