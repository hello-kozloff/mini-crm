import { Anchor, Button, Grid, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useDeleteTask, useTask } from '../api'
import { useMe } from '../auth/AuthProvider'
import { ErrorAlert, formatDate, NotFound, PageLoader, StatusBadge } from '../components/common'
import { TaskActions } from '../components/TaskActions'
import { TaskFormModal } from '../components/TaskFormModal'
import { TaskHistory } from '../components/TaskHistory'
import { notifyError, notifySuccess } from '../lib/errors'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text component="div">{children}</Text>
    </div>
  )
}

export function TaskPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const task = useTask(id)
  const remove = useDeleteTask()
  const [editOpened, editModal] = useDisclosure(false)
  const isManager = me.role === 'manager'

  if (task.isPending) return <PageLoader />
  if (task.isError) return <ErrorAlert error={task.error} />
  if (!task.data) return <NotFound text="Задача не найдена или у вас нет к ней доступа" />

  const t = task.data

  const confirmDelete = () =>
    modals.openConfirmModal({
      title: 'Удалить задачу?',
      children: <Text size="sm">Задача «{t.title}» и её история будут удалены.</Text>,
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        remove.mutate(t.id, {
          onSuccess: () => {
            notifySuccess('Задача удалена')
            navigate(`/objects/${t.object_id}`)
          },
          onError: notifyError,
        }),
    })

  return (
    <Stack>
      <Anchor component={Link} to={`/objects/${t.object_id}`} size="sm">
        ← {t.object?.name ?? 'Объект'}
      </Anchor>

      <Grid>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper withBorder p="md">
            <Stack>
              <Group justify="space-between" align="flex-start">
                <Title order={2}>{t.title}</Title>
                <StatusBadge status={t.status} />
              </Group>

              <SimpleGrid cols={{ base: 1, xs: 2 }}>
                <Field label="Объект">
                  <Anchor component={Link} to={`/objects/${t.object_id}`}>
                    {t.object?.name}
                  </Anchor>
                </Field>
                <Field label="Адрес">{t.object?.address}</Field>
                <Field label="Исполнитель">{t.assignee?.full_name}</Field>
                <Field label="Автор">{t.author?.full_name}</Field>
                <Field label="Создана">{formatDate(t.created_at)}</Field>
              </SimpleGrid>

              <Field label="Описание">
                <Text style={{ whiteSpace: 'pre-wrap' }}>{t.description || '—'}</Text>
              </Field>

              <TaskActions task={t} />

              {isManager && (
                <Group>
                  <Button variant="default" onClick={editModal.open}>
                    Редактировать
                  </Button>
                  <Button color="red" variant="light" onClick={confirmDelete}>
                    Удалить
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper withBorder p="md">
            <Title order={4} mb="md">
              История
            </Title>
            <TaskHistory taskId={t.id} />
          </Paper>
        </Grid.Col>
      </Grid>

      {isManager && <TaskFormModal opened={editOpened} onClose={editModal.close} initial={t} />}
    </Stack>
  )
}
