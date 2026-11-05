// Tries to break the access rules by calling Supabase directly (bypassing the UI).
//   SEED_PASSWORD=... bun scripts/security-check.ts
// Uses only the public anon key + demo users' passwords. Creates temporary fixtures
// prefixed with [security-check] and removes them at the end.
import { ANON_KEY, anonClient, env, signIn, SUPABASE_URL, userId, type Client } from './common'

const password = env('SEED_PASSWORD')
const PREFIX = '[security-check]'

type Result = { name: string; ok: boolean; details: string }
const results: Result[] = []

type Response = { data: unknown; error: { message: string } | null }

// The attack must be rejected: either an error, or nothing read / nothing changed.
async function expectDenied(name: string, run: () => PromiseLike<Response>) {
  const { data, error } = await run()
  const empty = data == null || (Array.isArray(data) && data.length === 0)
  results.push({
    name,
    ok: !!error || empty,
    details: error ? `error: ${error.message}` : empty ? 'no rows' : `LEAK: ${JSON.stringify(data).slice(0, 120)}`,
  })
}

async function expectAllowed(name: string, run: () => PromiseLike<Response>) {
  const { error } = await run()
  results.push({ name, ok: !error, details: error ? `error: ${error.message}` : 'ok' })
}

function check(name: string, ok: boolean, details: string) {
  results.push({ name, ok, details })
}

const rpc = (c: Client, taskId: string, to: 'new' | 'in_progress' | 'review' | 'accepted' | 'rework', comment?: string) =>
  c.rpc('change_task_status', { p_task_id: taskId, p_to: to, p_comment: comment })

const anon = anonClient()
const manager = await signIn('manager', password)
const exec1 = await signIn('executor1', password)
const exec2 = await signIn('executor2', password)
const exec1Id = await userId(exec1)
const exec2Id = await userId(exec2)
const managerId = await userId(manager)

// Fixtures: object A has a task for executor1 and one for executor2; object B only for executor2.
const { data: objs, error: objErr } = await manager
  .from('objects')
  .insert([
    { name: `${PREFIX} объект A`, address: 'test' },
    { name: `${PREFIX} объект B`, address: 'test' },
  ])
  .select('id')
if (objErr) throw objErr
const [objA, objB] = objs.map((o) => o.id)

const { data: tasks, error: taskErr } = await manager
  .from('tasks')
  .insert([
    { object_id: objA, title: `${PREFIX} задача исп.1`, assignee_id: exec1Id },
    { object_id: objB, title: `${PREFIX} задача исп.2`, assignee_id: exec2Id },
  ])
  .select('id')
if (taskErr) throw taskErr
const [own, foreign] = tasks.map((t) => t.id)

try {
  // --- Anonymous / registration ---
  await expectDenied('Аноним не читает задачи', () => anon.from('tasks').select('id'))
  await expectDenied('Аноним не читает объекты', () => anon.from('objects').select('id'))
  await expectDenied('Аноним не читает историю', () => anon.from('task_history').select('id'))
  await expectDenied('Аноним не вызывает смену статуса', () => rpc(anon, own, 'in_progress'))
  {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: ANON_KEY } })
    const settings = (await res.json()) as { disable_signup?: boolean }
    check('Открытая регистрация отключена (настройка Auth)', settings.disable_signup === true, `disable_signup=${settings.disable_signup}`)
    const { data, error } = await anon.auth.signUp({
      email: `intruder-${Date.now()}@example.com`,
      password: 'Intruder-123456',
    })
    check('Попытка регистрации отклонена', !!error && !data.user, error ? `error: ${error.message}` : 'SIGN-UP SUCCEEDED')
  }

  // --- Executor: reading ---
  {
    const { data, error } = await exec1.from('tasks').select('id, assignee_id')
    const leaked = (data ?? []).filter((t) => t.assignee_id !== exec1Id)
    check('Исполнитель видит только свои задачи', !error && leaked.length === 0 && (data ?? []).length > 0,
      error ? error.message : `${data!.length} своих, чужих: ${leaked.length}`)
  }
  await expectDenied('Исполнитель не читает чужую задачу по id', () => exec1.from('tasks').select('*').eq('id', foreign))
  await expectDenied('Исполнитель не читает историю чужой задачи', () => exec1.from('task_history').select('*').eq('task_id', foreign))
  await expectDenied('Исполнитель не видит объект без своих задач', () => exec1.from('objects').select('*').eq('id', objB))

  // --- Executor: writing ---
  await expectDenied('Исполнитель не меняет чужую задачу', () => exec1.from('tasks').update({ title: 'hacked' }).eq('id', foreign).select())
  await expectDenied('Исполнитель не меняет поля своей задачи', () => exec1.from('tasks').update({ title: 'hacked' }).eq('id', own).select())
  await expectDenied('Исполнитель не удаляет свою задачу', () => exec1.from('tasks').delete().eq('id', own).select())
  await expectDenied('Исполнитель не создаёт задачу', () =>
    exec1.from('tasks').insert({ object_id: objA, title: 'hacked', assignee_id: exec1Id }).select())
  await expectDenied('Исполнитель не создаёт объект', () => exec1.from('objects').insert({ name: 'hacked', address: 'x' }).select())
  await expectDenied('Исполнитель не меняет объект', () => exec1.from('objects').update({ name: 'hacked' }).eq('id', objA).select())
  await expectDenied('Пользователь не может сменить себе роль', () =>
    exec1.from('profiles').update({ role: 'manager' }).eq('id', exec1Id).select())

  // --- Status changes bypassing the RPC ---
  await expectDenied('Исполнитель не меняет статус напрямую (UPDATE)', () =>
    exec1.from('tasks').update({ status: 'accepted' }).eq('id', own).select())
  await expectDenied('Постановщик не меняет статус напрямую (UPDATE)', () =>
    manager.from('tasks').update({ status: 'accepted' }).eq('id', own).select())
  await expectDenied('Нельзя создать задачу сразу в статусе «Принята»', () =>
    manager.from('tasks').insert({ object_id: objA, title: 'hacked', assignee_id: exec1Id, status: 'accepted' }).select())
  await expectDenied('Нельзя подделать автора задачи', () =>
    manager.from('tasks').insert({ object_id: objA, title: 'hacked', assignee_id: exec1Id, author_id: exec1Id }).select())
  await expectDenied('Нельзя назначить исполнителем постановщика', () =>
    manager.from('tasks').update({ assignee_id: managerId }).eq('id', own).select())

  // --- Transition matrix in the RPC ---
  await expectDenied('Исполнитель не двигает чужую задачу', () => rpc(exec1, foreign, 'in_progress'))
  await expectDenied('Запрещённый переход Новая → Принята', () => rpc(exec1, own, 'accepted'))
  await expectDenied('Запрещённый переход Новая → На проверке', () => rpc(exec1, own, 'review'))
  await expectDenied('Постановщик не берёт задачу в работу за исполнителя', () => rpc(manager, own, 'in_progress'))
  await expectAllowed('Исполнитель: Новая → В работе', () => rpc(exec1, own, 'in_progress'))
  await expectDenied('Повторный переход в тот же статус', () => rpc(exec1, own, 'in_progress'))
  await expectAllowed('Исполнитель: В работе → На проверке', () => rpc(exec1, own, 'review'))
  await expectDenied('Исполнитель не принимает свою задачу', () => rpc(exec1, own, 'accepted'))
  await expectDenied('На доработку без комментария', () => rpc(manager, own, 'rework'))
  await expectDenied('На доработку с пустым комментарием', () => rpc(manager, own, 'rework', '   '))
  await expectAllowed('Постановщик: На проверке → На доработке (с комментарием)', () => rpc(manager, own, 'rework', 'Переделать'))
  await expectDenied('Постановщик не принимает задачу из «На доработке»', () => rpc(manager, own, 'accepted'))

  // --- History is append-only ---
  {
    const { data } = await manager.from('task_history').select('id, to_status').eq('task_id', own).order('id')
    check('История записана для каждого перехода', (data ?? []).map((h) => h.to_status).join(',') === 'new,in_progress,review,rework',
      (data ?? []).map((h) => h.to_status).join(' → '))
    const historyId = data?.[0]?.id ?? 0
    for (const [who, c] of [['Постановщик', manager], ['Исполнитель', exec1]] as const) {
      await expectDenied(`${who} не добавляет запись в историю`, () =>
        c.from('task_history').insert({ task_id: own, actor_id: exec1Id, from_status: 'review', to_status: 'accepted' }).select())
      await expectDenied(`${who} не изменяет историю`, () =>
        c.from('task_history').update({ comment: 'forged' }).eq('id', historyId).select())
      await expectDenied(`${who} не удаляет историю`, () => c.from('task_history').delete().eq('id', historyId).select())
    }
    const { data: after } = await manager.from('task_history').select('id').eq('task_id', own)
    check('История не изменилась после атак', after?.length === 4, `${after?.length} записей`)
  }

  {
    const { data } = await manager.from('tasks').select('title, status').eq('id', own).single()
    check('Задача не изменена атаками', data?.title === `${PREFIX} задача исп.1` && data?.status === 'rework', JSON.stringify(data))
  }
} finally {
  // Cleanup (also checks that a manager can delete a task together with its history).
  const del = await manager.from('tasks').delete().in('id', [own, foreign])
  check('Постановщик удаляет задачи (история удаляется каскадом)', !del.error, del.error?.message ?? 'ok')
  await manager.from('objects').delete().in('id', [objA, objB])
}

const width = Math.max(...results.map((r) => r.name.length))
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width)}  ${r.details}`)
const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
