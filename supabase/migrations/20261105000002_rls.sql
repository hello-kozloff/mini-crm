-- Access control: RLS policies + explicit table/column privileges.
-- Rule of thumb: nothing is granted by default; every permission below is deliberate.

create function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'manager'
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_manager() to authenticated;
revoke execute on function private.is_manager() from public, anon;

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;

-- Drop Supabase's default "grant all" and grant only what is needed.
revoke all on public.profiles, public.objects, public.tasks, public.task_history
  from anon, authenticated;

-- Profiles: read-only for signed-in users (names in task cards and history).
-- No insert/update/delete: a user cannot change own role.
grant select on public.profiles to authenticated;

create policy "profiles: authenticated read"
  on public.profiles for select to authenticated
  using (true);

-- Objects: managers manage everything; executors see only objects where they have tasks.
grant select, delete on public.objects to authenticated;
grant insert (name, address), update (name, address) on public.objects to authenticated;

create policy "objects: read"
  on public.objects for select to authenticated
  using (
    (select private.is_manager())
    or exists (
      select 1 from public.tasks t
      where t.object_id = objects.id and t.assignee_id = (select auth.uid())
    )
  );

create policy "objects: manager insert"
  on public.objects for insert to authenticated
  with check ((select private.is_manager()));

create policy "objects: manager update"
  on public.objects for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

create policy "objects: manager delete"
  on public.objects for delete to authenticated
  using ((select private.is_manager()));

-- Tasks: managers manage everything; executors only read their own.
-- status / author_id / created_at are not writable directly (status changes via change_task_status()).
grant select, delete on public.tasks to authenticated;
grant insert (object_id, title, description, assignee_id),
      update (object_id, title, description, assignee_id)
  on public.tasks to authenticated;

create policy "tasks: read"
  on public.tasks for select to authenticated
  using (
    (select private.is_manager())
    or assignee_id = (select auth.uid())
  );

create policy "tasks: manager insert"
  on public.tasks for insert to authenticated
  with check ((select private.is_manager()));

create policy "tasks: manager update"
  on public.tasks for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

create policy "tasks: manager delete"
  on public.tasks for delete to authenticated
  using ((select private.is_manager()));

-- History: read-only, written only by triggers / change_task_status().
grant select on public.task_history to authenticated;

create policy "task_history: read"
  on public.task_history for select to authenticated
  using (
    (select private.is_manager())
    or exists (
      select 1 from public.tasks t
      where t.id = task_history.task_id and t.assignee_id = (select auth.uid())
    )
  );
