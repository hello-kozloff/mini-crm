import type { Enums, Tables } from './database.types'

export type TaskStatus = Enums<'task_status'>
export type Profile = Tables<'profiles'>
export type Task = Tables<'tasks'>

export const STATUS_LABEL: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
}

export const STATUS_COLOR: Record<TaskStatus, string> = {
  new: 'gray',
  in_progress: 'blue',
  review: 'yellow',
  accepted: 'green',
  rework: 'red',
}

export const ROLE_LABEL: Record<Profile['role'], string> = {
  manager: 'Постановщик',
  executor: 'Исполнитель',
}

export type TaskAction = {
  to: TaskStatus
  label: string
  color: string
  requiresComment: boolean
}

// Mirror of the transition matrix in public.change_task_status().
// Used only to decide which buttons to show — the database enforces the rules.
const TRANSITIONS: Array<TaskAction & { from: TaskStatus; by: 'assignee' | 'manager' }> = [
  { from: 'new', to: 'in_progress', by: 'assignee', label: 'Взять в работу', color: 'blue', requiresComment: false },
  { from: 'in_progress', to: 'review', by: 'assignee', label: 'Отправить на проверку', color: 'yellow', requiresComment: false },
  { from: 'review', to: 'accepted', by: 'manager', label: 'Принять', color: 'green', requiresComment: false },
  { from: 'review', to: 'rework', by: 'manager', label: 'Вернуть на доработку', color: 'red', requiresComment: true },
  { from: 'rework', to: 'in_progress', by: 'assignee', label: 'Взять в работу', color: 'blue', requiresComment: false },
]

export function availableActions(task: Pick<Task, 'status' | 'assignee_id'>, me: Profile): TaskAction[] {
  return TRANSITIONS.filter(
    (t) =>
      t.from === task.status &&
      (t.by === 'manager' ? me.role === 'manager' : task.assignee_id === me.id),
  )
}
