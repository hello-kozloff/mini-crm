import { Anchor, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { Link, useNavigate, useParams } from 'react-router'
import { useDeleteObject, useObject, useObjectTasks } from '../api'
import { useMe } from '../auth/AuthProvider'
import { ErrorAlert, NotFound, PageLoader } from '../components/common'
import { ObjectFormModal } from '../components/ObjectFormModal'
import { TaskFormModal } from '../components/TaskFormModal'
import { TasksTable } from '../components/TasksTable'
import { notifyError, notifySuccess } from '../lib/errors'

export function ObjectPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const object = useObject(id)
  const tasks = useObjectTasks(id)
  const remove = useDeleteObject()
  const [editOpened, editModal] = useDisclosure(false)
  const [taskOpened, taskModal] = useDisclosure(false)
  const isManager = me.role === 'manager'

  if (object.isPending) return <PageLoader />
  if (object.isError) return <ErrorAlert error={object.error} />
  if (!object.data) return <NotFound text="Объект не найден или у вас нет к нему доступа" />

  const obj = object.data

  const confirmDelete = () =>
    modals.openConfirmModal({
      title: 'Удалить объект?',
      children: <Text size="sm">Объект «{obj.name}» будет удалён. Объект с задачами удалить нельзя.</Text>,
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        remove.mutate(obj.id, {
          onSuccess: () => {
            notifySuccess('Объект удалён')
            navigate('/')
          },
          onError: notifyError,
        }),
    })

  return (
    <Stack>
      <Anchor component={Link} to="/" size="sm">
        ← Все объекты
      </Anchor>

      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>{obj.name}</Title>
            <Text c="dimmed">{obj.address}</Text>
          </div>
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
        </Group>
      </Paper>

      <Group justify="space-between">
        <Title order={3}>{isManager ? 'Задачи' : 'Мои задачи на объекте'}</Title>
        {isManager && <Button onClick={taskModal.open}>Новая задача</Button>}
      </Group>

      {tasks.isPending ? (
        <PageLoader />
      ) : tasks.isError ? (
        <ErrorAlert error={tasks.error} />
      ) : (
        <TasksTable tasks={tasks.data} showAssignee empty="Задач нет" />
      )}

      {isManager && (
        <>
          <ObjectFormModal opened={editOpened} onClose={editModal.close} initial={obj} />
          <TaskFormModal opened={taskOpened} onClose={taskModal.close} initial={{ object_id: obj.id }} />
        </>
      )}
    </Stack>
  )
}
