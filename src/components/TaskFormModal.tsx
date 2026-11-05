import { Button, Group, Modal, Select, Stack, TextInput, Textarea } from '@mantine/core'
import { useState, type FormEvent } from 'react'
import { useExecutors, useObjects, useSaveTask, type TaskInput } from '../api'
import { notifyError, notifySuccess } from '../lib/errors'

type Props = {
  opened: boolean
  onClose: () => void
  initial: Partial<TaskInput> & { id?: string }
}

export function TaskFormModal({ opened, onClose, initial }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title={initial.id ? 'Редактировать задачу' : 'Новая задача'} size="lg">
      {opened && <TaskForm initial={initial} onDone={onClose} />}
    </Modal>
  )
}

function TaskForm({ initial, onDone }: { initial: Props['initial']; onDone: () => void }) {
  const [title, setTitle] = useState(initial.title ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [objectId, setObjectId] = useState<string | null>(initial.object_id ?? null)
  const [assigneeId, setAssigneeId] = useState<string | null>(initial.assignee_id ?? null)

  const objects = useObjects()
  const executors = useExecutors()
  const save = useSaveTask()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!objectId || !assigneeId) return
    save.mutate(
      {
        id: initial.id,
        title: title.trim(),
        description: description.trim(),
        object_id: objectId,
        assignee_id: assigneeId,
      },
      {
        onSuccess: () => {
          notifySuccess(initial.id ? 'Задача сохранена' : 'Задача создана')
          onDone()
        },
        onError: notifyError,
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <Stack>
        <TextInput label="Название" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
        <Textarea
          label="Описание"
          autosize
          minRows={3}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />
        <Select
          label="Объект"
          required
          searchable
          data={(objects.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
          value={objectId}
          onChange={setObjectId}
        />
        <Select
          label="Исполнитель"
          required
          searchable
          data={(executors.data ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
          value={assigneeId}
          onChange={setAssigneeId}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={save.isPending} disabled={!objectId || !assigneeId}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
