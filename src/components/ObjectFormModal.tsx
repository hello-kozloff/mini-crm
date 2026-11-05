import { Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import { useState, type FormEvent } from 'react'
import { useSaveObject, type ObjectInput } from '../api'
import { notifyError, notifySuccess } from '../lib/errors'

type Props = {
  opened: boolean
  onClose: () => void
  initial?: ObjectInput & { id: string }
}

export function ObjectFormModal({ opened, onClose, initial }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title={initial ? 'Редактировать объект' : 'Новый объект'}>
      {/* Remount the form on each open so it starts from fresh values. */}
      {opened && <ObjectForm initial={initial} onDone={onClose} />}
    </Modal>
  )
}

function ObjectForm({ initial, onDone }: { initial?: Props['initial']; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const save = useSaveObject()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { id: initial?.id, name: name.trim(), address: address.trim() },
      {
        onSuccess: () => {
          notifySuccess(initial ? 'Объект сохранён' : 'Объект создан')
          onDone()
        },
        onError: notifyError,
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <Stack>
        <TextInput label="Название" required value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <TextInput label="Адрес" required value={address} onChange={(e) => setAddress(e.currentTarget.value)} />
        <Group justify="flex-end">
          <Button type="submit" loading={save.isPending}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
