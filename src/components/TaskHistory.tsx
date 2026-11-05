import { Text, Timeline } from '@mantine/core'
import { useTaskHistory } from '../api'
import { STATUS_LABEL } from '../lib/status'
import { ErrorAlert, formatDate, PageLoader, StatusBadge } from './common'

export function TaskHistory({ taskId }: { taskId: string }) {
  const history = useTaskHistory(taskId)

  if (history.isPending) return <PageLoader />
  if (history.isError) return <ErrorAlert error={history.error} />
  if (history.data.length === 0) return <Text c="dimmed">История пуста</Text>

  return (
    <Timeline active={history.data.length - 1} bulletSize={16} lineWidth={2}>
      {history.data.map((h) => (
        <Timeline.Item
          key={h.id}
          title={
            <>
              {h.from_status ? `${STATUS_LABEL[h.from_status]} → ` : 'Создана → '}
              <StatusBadge status={h.to_status} />
            </>
          }
        >
          <Text size="sm" c="dimmed">
            {h.actor?.full_name} · {formatDate(h.created_at)}
          </Text>
          {h.comment && (
            <Text size="sm" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
              {h.comment}
            </Text>
          )}
        </Timeline.Item>
      ))}
    </Timeline>
  )
}
