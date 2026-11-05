// Shared helpers for scripts. Bun loads .env / .env.local automatically.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/database.types'

export type Client = SupabaseClient<Database>

export function env(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing env variable ${name} (see .env.example)`)
    process.exit(1)
  }
  return value
}

export const SUPABASE_URL = env('VITE_SUPABASE_URL')
export const ANON_KEY = env('VITE_SUPABASE_ANON_KEY')

export const DEMO_USERS = {
  manager: { email: 'manager@example.com', full_name: 'Анна Смирнова', role: 'manager' },
  executor1: { email: 'petrov@example.com', full_name: 'Иван Петров', role: 'executor' },
  executor2: { email: 'sidorov@example.com', full_name: 'Олег Сидоров', role: 'executor' },
} as const

export type DemoUserKey = keyof typeof DEMO_USERS

export function anonClient(): Client {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function signIn(key: DemoUserKey, password: string): Promise<Client> {
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({ email: DEMO_USERS[key].email, password })
  if (error) throw new Error(`Sign in as ${key} failed: ${error.message}`)
  return client
}

export async function userId(client: Client): Promise<string> {
  const { data } = await client.auth.getUser()
  if (!data.user) throw new Error('Not signed in')
  return data.user.id
}
