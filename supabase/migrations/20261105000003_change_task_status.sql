-- The only way to change a task status. Validates the transition, the actor and the comment,
-- updates the task and appends a history entry in one transaction.
--
--   new         -> in_progress  assigned executor
--   in_progress -> review       assigned executor
--   review      -> accepted     manager
--   review      -> rework       manager, comment required
--   rework      -> in_progress  assigned executor

create function public.change_task_status(
  p_task_id uuid,
  p_to public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_is_manager boolean := private.is_manager();
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_task public.tasks;
  v_from public.task_status;
  v_allowed boolean;
begin
  if v_uid is null then
    raise exception 'Требуется вход в систему' using errcode = '42501';
  end if;

  -- Lock the row so two concurrent actions cannot both pass the check.
  select * into v_task from public.tasks where id = p_task_id for update;

  -- Same answer for "does not exist" and "not yours": do not reveal foreign tasks.
  if not found or not (v_is_manager or v_task.assignee_id = v_uid) then
    raise exception 'Задача не найдена' using errcode = 'P0002';
  end if;

  v_from := v_task.status;
  v_allowed := case
    when v_from = 'new'         and p_to = 'in_progress' then v_task.assignee_id = v_uid
    when v_from = 'in_progress' and p_to = 'review'      then v_task.assignee_id = v_uid
    when v_from = 'review'      and p_to = 'accepted'    then v_is_manager
    when v_from = 'review'      and p_to = 'rework'      then v_is_manager
    when v_from = 'rework'      and p_to = 'in_progress' then v_task.assignee_id = v_uid
    else false
  end;

  if not v_allowed then
    raise exception 'Переход «%» → «%» запрещён для текущего пользователя', v_from, p_to
      using errcode = '42501';
  end if;

  if p_to = 'rework' and v_comment is null then
    raise exception 'Для возврата на доработку нужен комментарий' using errcode = '23514';
  end if;

  perform set_config('app.via_rpc', 'on', true);

  update public.tasks set status = p_to where id = p_task_id
  returning * into v_task;

  perform set_config('app.via_rpc', '', true);

  insert into public.task_history (task_id, actor_id, from_status, to_status, comment)
  values (p_task_id, v_uid, v_from, p_to, v_comment);

  return v_task;
end;
$$;

revoke execute on function public.change_task_status(uuid, public.task_status, text) from public, anon;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;
