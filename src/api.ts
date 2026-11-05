import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TaskStatus } from './lib/status'
import { supabase } from './lib/supabase'

// Visibility filtering is done by RLS: the same queries return everything for a manager
// and only own tasks / related objects for an executor.

const TASK_LIST_SELECT =
  'id, title, status, created_at, object_id, assignee_id, assignee:profiles!tasks_assignee_id_fkey(full_name), object:objects(name)'

export function useObjects() {
  return useQuery({
    queryKey: ['objects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objects')
        .select('*, tasks(count)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useObject(id: string) {
  return useQuery({
    queryKey: ['objects', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('objects').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useObjectTasks(objectId: string) {
  return useQuery({
    queryKey: ['tasks', { objectId }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_LIST_SELECT)
        .eq('object_id', objectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useMyTasks(userId: string) {
  return useQuery({
    queryKey: ['tasks', { assigneeId: userId }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_LIST_SELECT)
        .eq('assignee_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          '*, object:objects(id, name, address), assignee:profiles!tasks_assignee_id_fkey(full_name), author:profiles!tasks_author_id_fkey(full_name)',
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useTaskHistory(taskId: string) {
  return useQuery({
    queryKey: ['task_history', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_history')
        .select('*, actor:profiles(full_name)')
        .eq('task_id', taskId)
        .order('created_at')
        .order('id')
      if (error) throw error
      return data
    },
  })
}

export function useExecutors(enabled = true) {
  return useQuery({
    queryKey: ['executors'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'executor')
        .order('full_name')
      if (error) throw error
      return data
    },
  })
}

// Mutations ------------------------------------------------------------------

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

export type ObjectInput = { name: string; address: string }

export function useSaveObject() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, ...input }: ObjectInput & { id?: string }) => {
      const query = id
        ? supabase.from('objects').update(input).eq('id', id)
        : supabase.from('objects').insert(input)
      const { error } = await query
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteObject() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('objects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export type TaskInput = { title: string; description: string; object_id: string; assignee_id: string }

export function useSaveTask() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, ...input }: TaskInput & { id?: string }) => {
      const query = id
        ? supabase.from('tasks').update(input).eq('id', id)
        : supabase.from('tasks').insert(input)
      const { error } = await query
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useChangeStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (args: { taskId: string; to: TaskStatus; comment?: string }) => {
      const { error } = await supabase.rpc('change_task_status', {
        p_task_id: args.taskId,
        p_to: args.to,
        p_comment: args.comment,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
