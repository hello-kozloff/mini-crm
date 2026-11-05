import { Anchor, Table, Text } from '@mantine/core'
import { Link } from 'react-router'
import type { TaskStatus } from '../lib/status'
import { formatDate, StatusBadge } from './common'

export type TaskRow = {
  id: string
  title: string
  status: TaskStatus
  created_at: string
  assignee: { full_name: string } | null
  object: { name: string } | null
}

type Props = {
  tasks: TaskRow[]
  showObject?: boolean
  showAssignee?: boolean
  empty: string
}

export function TasksTable({ tasks, showObject, showAssignee, empty }: Props) {
  if (tasks.length === 0) return <Text c="dimmed">{empty}</Text>

  return (
    <Table.ScrollContainer minWidth={560}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Задача</Table.Th>
            {showObject && <Table.Th>Объект</Table.Th>}
            {showAssignee && <Table.Th>Исполнитель</Table.Th>}
            <Table.Th>Статус</Table.Th>
            <Table.Th>Создана</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tasks.map((t) => (
            <Table.Tr key={t.id}>
              <Table.Td>
                <Anchor component={Link} to={`/tasks/${t.id}`}>
                  {t.title}
                </Anchor>
              </Table.Td>
              {showObject && <Table.Td>{t.object?.name}</Table.Td>}
              {showAssignee && <Table.Td>{t.assignee?.full_name}</Table.Td>}
              <Table.Td>
                <StatusBadge status={t.status} />
              </Table.Td>
              <Table.Td>{formatDate(t.created_at)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
