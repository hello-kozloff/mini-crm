# Мини-CRM «Объекты и задачи»

Постановщик создаёт объекты (стройки) и задачи, назначает исполнителей, принимает работу или возвращает на доработку. Исполнитель видит только свои задачи, берёт их в работу и отправляет на проверку. Каждая смена статуса попадает в историю.

**Стек:** React 19 + TypeScript + Vite, Mantine, TanStack Query, react-router, Supabase (Postgres + Auth). Деплой — Vercel.

- [docs/FOR_MANAGER.md](docs/FOR_MANAGER.md) — объяснение для руководителя без технических терминов
- [docs/DECISIONS.md](docs/DECISIONS.md) — решения, допущения и что не вошло

## Как устроена защита

Все правила живут в базе, интерфейс только показывает доступные кнопки.

| Что | Где |
|---|---|
| Кто что видит и меняет | RLS-политики + явные права на таблицы и отдельные колонки — [`20261105000002_rls.sql`](supabase/migrations/20261105000002_rls.sql) |
| Смена статуса | только через функцию `change_task_status()`: проверяет переход, роль, исполнителя, комментарий и пишет историю в одной транзакции — [`20261105000003_change_task_status.sql`](supabase/migrations/20261105000003_change_task_status.sql). Колонку `status` нельзя изменить обычным `UPDATE`: на неё нет прав, плюс триггер-страховка |
| История | для клиента только чтение; триггер запрещает изменение и удаление (кроме каскада при удалении задачи постановщиком) — [`20261105000001_schema.sql`](supabase/migrations/20261105000001_schema.sql) |
| Автор, статус при создании, роль исполнителя | проставляются/проверяются триггерами, подделать из запроса нельзя |
| Регистрация | отключена; пользователей создаёт администратор (`scripts/seed.ts`) |
| Ключи | во фронтенде только публичный anon key; `service_role` нужен только локальному seed-скрипту и не коммитится |

Проверка: `scripts/security-check.ts` обращается к Supabase напрямую (в обход UI) и пытается нарушить каждое правило — 40+ проверок.

## Запуск

Нужны [Bun](https://bun.sh) (или Node 20+) и проект в [Supabase](https://supabase.com).

1. **Supabase**: создать проект. В *Authentication → Sign In / Providers* выключить **Allow new users to sign up**.
2. **Переменные окружения**: `cp .env.example .env.local` и заполнить из *Project Settings → API*.
   `SUPABASE_SERVICE_ROLE_KEY` нужен только для seed и никогда не получает префикс `VITE_` (Vite отдаёт в браузер только `VITE_*`).
3. **Зависимости и миграции**:
   ```bash
   bun install
   bunx supabase login
   bunx supabase link --project-ref <project-ref>
   bunx supabase db push
   ```
4. **Тестовые пользователи и данные** (1 постановщик, 2 исполнителя, 3 объекта, 8 задач во всех статусах с историей):
   ```bash
   SEED_PASSWORD='<пароль>' bun scripts/seed.ts
   ```
5. **Проверка безопасности**:
   ```bash
   SEED_PASSWORD='<пароль>' bun scripts/security-check.ts
   ```
6. **Запуск**: `bun run dev` → http://localhost:5173

Типы БД пересоздаются командой `bunx supabase gen types typescript --linked > src/lib/database.types.ts`.

## Деплой (Vercel)

Импортировать репозиторий в Vercel (фреймворк Vite определяется автоматически), задать `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`. `vercel.json` перенаправляет все пути на `index.html` (SPA).

## Структура

```
supabase/migrations/   схема, права доступа, функция смены статуса
scripts/               seed.ts — пользователи и демо-данные; security-check.ts — проверка правил доступа
src/lib/               клиент Supabase, типы БД, статусы и доступные действия (зеркало правил БД для UI)
src/api.ts             запросы и мутации (TanStack Query)
src/auth/              сессия и профиль текущего пользователя
src/pages/             вход, объекты, карточка объекта, карточка задачи, «Мои задачи»
src/components/        layout, формы, таблица задач, кнопки действий, история
```
