import { notifications } from '@mantine/notifications'

type DbError = { code?: string; message: string }

// Turns a Postgres/PostgREST error into a message for the user.
export function errorMessage(error: unknown): string {
  const e = error as DbError
  switch (e?.code) {
    case '23503':
      return 'Нельзя удалить: есть связанные записи (например, у объекта есть задачи)'
    case '42501':
      // Our own checks raise readable Russian messages with this code; plain privilege errors do not.
      return /[а-яё]/i.test(e.message) ? e.message : 'Недостаточно прав для этого действия'
    default:
      return e?.message ?? 'Неизвестная ошибка'
  }
}

export function notifyError(error: unknown) {
  notifications.show({ color: 'red', title: 'Ошибка', message: errorMessage(error) })
}

export function notifySuccess(message: string) {
  notifications.show({ color: 'green', message })
}
