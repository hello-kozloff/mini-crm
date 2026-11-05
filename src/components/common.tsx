import { Alert, Badge, Center, Loader } from '@mantine/core'
import dayjs from 'dayjs'
import { errorMessage } from '../lib/errors'
import { STATUS_COLOR, STATUS_LABEL, type TaskStatus } from '../lib/status'

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge color={STATUS_COLOR[status]} variant="light">
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export function PageLoader() {
  return (
    <Center py="xl">
      <Loader />
    </Center>
  )
}

export function ErrorAlert({ error }: { error: unknown }) {
  return (
    <Alert color="red" title="Ошибка загрузки">
      {errorMessage(error)}
    </Alert>
  )
}

export function NotFound({ text }: { text: string }) {
  return <Alert color="gray">{text}</Alert>
}

export const formatDate = (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm')
