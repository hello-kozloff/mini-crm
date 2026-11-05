// Creates demo users and demo data.
//   bun scripts/seed.ts
// The service role key is used ONLY here, ONLY to create users (sign-up is disabled).
// All data is then created through the regular API under those users, so every status
// change goes through change_task_status() and gets a real history entry.
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { DEMO_USERS, env, signIn, SUPABASE_URL, userId, type Client, type DemoUserKey } from './common'
import type { Database } from '../src/lib/database.types'

type TaskStatus = Database['public']['Enums']['task_status']

const password = process.env.SEED_PASSWORD || randomBytes(9).toString('base64url')

const admin = createClient<Database>(SUPABASE_URL, env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function upsertUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error

  for (const [key, u] of Object.entries(DEMO_USERS)) {
    const existing = data.users.find((x) => x.email === u.email)
    const attrs = {
      password,
      email_confirm: true,
      app_metadata: { role: u.role },
      user_metadata: { full_name: u.full_name },
    }
    const res = existing
      ? await admin.auth.admin.updateUserById(existing.id, attrs)
      : await admin.auth.admin.createUser({ email: u.email, ...attrs })
    if (res.error) throw res.error
    console.log(`${existing ? 'updated' : 'created'} ${key}: ${u.email}`)
  }
}

// Path of transitions from 'new' to the target status (with the actor of each step).
const PATHS: Record<string, Array<{ to: TaskStatus; by: 'manager' | 'assignee'; comment?: string }>> = {
  new: [],
  in_progress: [{ to: 'in_progress', by: 'assignee' }],
  review: [
    { to: 'in_progress', by: 'assignee' },
    { to: 'review', by: 'assignee' },
  ],
  accepted: [
    { to: 'in_progress', by: 'assignee' },
    { to: 'review', by: 'assignee' },
    { to: 'accepted', by: 'manager', comment: 'Принято, спасибо' },
  ],
  rework: [
    { to: 'in_progress', by: 'assignee' },
    { to: 'review', by: 'assignee' },
    { to: 'rework', by: 'manager', comment: 'Не вывезен строительный мусор, приложите фото' },
  ],
  accepted_after_rework: [
    { to: 'in_progress', by: 'assignee' },
    { to: 'review', by: 'assignee' },
    { to: 'rework', by: 'manager', comment: 'Нет акта замеров, добавьте' },
    { to: 'in_progress', by: 'assignee' },
    { to: 'review', by: 'assignee' },
    { to: 'accepted', by: 'manager' },
  ],
}

const OBJECTS = [
  { name: 'ЖК «Северный», корпус 2', address: 'г. Казань, ул. Ленина, 15' },
  { name: 'Школа № 7 — реконструкция', address: 'г. Казань, ул. Садовая, 3' },
  { name: 'Складской комплекс «Восток»', address: 'Казанская обл., промзона «Восток», участок 12' },
]

const TASKS: Array<{ object: number; title: string; description: string; assignee: DemoUserKey; path: keyof typeof PATHS }> = [
  { object: 0, title: 'Залить фундамент секции А', description: 'Бетон М300, после заливки — уход 7 дней.', assignee: 'executor1', path: 'accepted' },
  { object: 0, title: 'Монтаж опалубки 3 этажа', description: 'По проекту КЖ-3, лист 12.', assignee: 'executor1', path: 'review' },
  { object: 0, title: 'Приёмка арматуры', description: 'Проверить сертификаты и количество по накладной.', assignee: 'executor2', path: 'in_progress' },
  { object: 1, title: 'Демонтаж старой кровли', description: 'Площадь ~600 м², мусор вывезти контейнерами.', assignee: 'executor2', path: 'rework' },
  { object: 1, title: 'Замена окон в спортзале', description: '12 окон, ПВХ, с откосами.', assignee: 'executor1', path: 'new' },
  { object: 1, title: 'Проверка вентиляции', description: 'Замеры воздухообмена, акт по форме.', assignee: 'executor2', path: 'accepted_after_rework' },
  { object: 2, title: 'Геодезическая разметка участка', description: 'Вынос осей здания в натуру.', assignee: 'executor1', path: 'in_progress' },
  { object: 2, title: 'Временное электроснабжение', description: 'Щит ВРУ, кабель от ТП-14.', assignee: 'executor1', path: 'new' },
]

async function seedData() {
  const manager = await signIn('manager', password)
  const executors: Record<string, Client> = {
    executor1: await signIn('executor1', password),
    executor2: await signIn('executor2', password),
  }
  const ids: Record<string, string> = {
    executor1: await userId(executors.executor1),
    executor2: await userId(executors.executor2),
  }

  const { count } = await manager.from('objects').select('*', { count: 'exact', head: true })
  if (count) {
    console.log(`objects already exist (${count}) — skipping demo data`)
    return
  }

  const { data: objects, error } = await manager.from('objects').insert(OBJECTS).select('id')
  if (error) throw error

  for (const t of TASKS) {
    const { data: task, error } = await manager
      .from('tasks')
      .insert({
        object_id: objects[t.object].id,
        title: t.title,
        description: t.description,
        assignee_id: ids[t.assignee],
      })
      .select('id')
      .single()
    if (error) throw error

    for (const step of PATHS[t.path]) {
      const actor = step.by === 'manager' ? manager : executors[t.assignee]
      const { error } = await actor.rpc('change_task_status', {
        p_task_id: task.id,
        p_to: step.to,
        p_comment: step.comment,
      })
      if (error) throw new Error(`${t.title}: ${step.to}: ${error.message}`)
    }
    console.log(`task: ${t.title} → ${t.path}`)
  }
}

await upsertUsers()
await seedData()

console.log('\nDemo users (password for all):', password)
for (const u of Object.values(DEMO_USERS)) console.log(`  ${u.role.padEnd(8)} ${u.email}  ${u.full_name}`)
