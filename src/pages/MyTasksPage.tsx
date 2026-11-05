import { SegmentedControl, Stack, Title } from '@mantine/core'
import { useState } from 'react'
import { useMyTasks } from '../api'
import { useMe } from '../auth/AuthProvider'
import { ErrorAlert, PageLoader } from '../components/common'
import { TasksTable } from '../components/TasksTable'
import type { TaskStatus } from '../lib/status'

const ACTIVE: TaskStatus[] = ['new', 'in_progress', 'rework', 'review']

export function MyTasksPage() {
  const me = useMe()
  const tasks = useMyTasks(me.id)
  const [filter, setFilter] = useState<'active' | 'all'>('active')

  const rows = (tasks.data ?? []).filter((t) => filter === 'all' || ACTIVE.includes(t.status))

  return (
    <Stack>
      <Title order={2}>Мои задачи</Title>
      <SegmentedControl
        w="fit-content"
        value={filter}
        onChange={(v) => setFilter(v as 'active' | 'all')}
        data={[
          { value: 'active', label: 'Активные' },
          { value: 'all', label: 'Все' },
        ]}
      />
      {tasks.isPending ? (
        <PageLoader />
      ) : tasks.isError ? (
        <ErrorAlert error={tasks.error} />
      ) : (
        <TasksTable tasks={rows} showObject empty="Задач нет" />
      )}
    </Stack>
  )
}
