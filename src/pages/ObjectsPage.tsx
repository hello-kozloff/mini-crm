import { Anchor, Button, Group, Stack, Table, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link } from 'react-router'
import { useObjects } from '../api'
import { useMe } from '../auth/AuthProvider'
import { ErrorAlert, PageLoader } from '../components/common'
import { ObjectFormModal } from '../components/ObjectFormModal'

export function ObjectsPage() {
  const me = useMe()
  const objects = useObjects()
  const [createOpened, createModal] = useDisclosure(false)
  const isManager = me.role === 'manager'

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Объекты</Title>
        {isManager && <Button onClick={createModal.open}>Добавить объект</Button>}
      </Group>

      {objects.isPending ? (
        <PageLoader />
      ) : objects.isError ? (
        <ErrorAlert error={objects.error} />
      ) : objects.data.length === 0 ? (
        <Text c="dimmed">{isManager ? 'Объектов пока нет' : 'У вас нет задач ни на одном объекте'}</Text>
      ) : (
        <Table.ScrollContainer minWidth={480}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Название</Table.Th>
                <Table.Th>Адрес</Table.Th>
                <Table.Th>{isManager ? 'Задач' : 'Моих задач'}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {objects.data.map((o) => (
                <Table.Tr key={o.id}>
                  <Table.Td>
                    <Anchor component={Link} to={`/objects/${o.id}`}>
                      {o.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>{o.address}</Table.Td>
                  <Table.Td>{o.tasks[0]?.count ?? 0}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {isManager && <ObjectFormModal opened={createOpened} onClose={createModal.close} />}
    </Stack>
  )
}
