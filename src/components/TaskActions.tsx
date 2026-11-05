import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { useState } from 'react'
import { useChangeStatus } from '../api'
import { useMe } from '../auth/AuthProvider'
import { notifyError, notifySuccess } from '../lib/errors'
import { availableActions, STATUS_LABEL, type Task, type TaskAction } from '../lib/status'

export function TaskActions({ task }: { task: Pick<Task, 'id' | 'status' | 'assignee_id'> }) {
  const me = useMe()
  const change = useChangeStatus()
  const [commentFor, setCommentFor] = useState<TaskAction | null>(null)
  const [comment, setComment] = useState('')

  const actions = availableActions(task, me)
  if (actions.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Нет доступных действий
      </Text>
    )
  }

  const run = (action: TaskAction, text?: string) =>
    change.mutate(
      { taskId: task.id, to: action.to, comment: text },
      {
        onSuccess: () => {
          notifySuccess(`Статус: ${STATUS_LABEL[action.to]}`)
          setCommentFor(null)
          setComment('')
        },
        onError: notifyError,
      },
    )

  return (
    <>
      <Group>
        {actions.map((a) => (
          <Button
            key={a.to}
            color={a.color}
            loading={change.isPending && change.variables?.to === a.to}
            disabled={change.isPending}
            onClick={() => (a.requiresComment ? setCommentFor(a) : run(a))}
          >
            {a.label}
          </Button>
        ))}
      </Group>

      <Modal opened={!!commentFor} onClose={() => setCommentFor(null)} title={commentFor?.label}>
        <Stack>
          <Textarea
            label="Комментарий"
            description="Что нужно исправить"
            required
            autosize
            minRows={3}
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              color={commentFor?.color}
              disabled={!comment.trim()}
              loading={change.isPending}
              onClick={() => commentFor && run(commentFor, comment.trim())}
            >
              {commentFor?.label}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
