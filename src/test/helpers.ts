import type { Env } from '../types'
import initSql from '../db/migrations/0001_init.sql?raw'
import domainSql from '../db/migrations/0002_domain_schema.sql?raw'
import convSql from '../db/migrations/0003_conversations_vector_sync.sql?raw'

/**
 * Applies all D1 migrations (in order) to the isolated per-test-file
 * database provided by vitest-pool-workers. New migrations must be
 * registered here in order (the list is intentionally explicit so test
 * schema state is reviewable).
 */
const MIGRATIONS: Array<{ name: string; sql: string }> = [
  { name: '0001_init', sql: initSql },
  { name: '0002_domain_schema', sql: domainSql },
  { name: '0003_conversations_vector_sync', sql: convSql },
]

export async function applyMigrations(env: Env): Promise<void> {
  for (const { name, sql } of MIGRATIONS) {
    // Strip comment lines, then split on ';' (D1's exec() splits on newlines,
    // which breaks multi-line CREATE TABLE statements).
    const statements = sql
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    try {
      await env.DB.batch(statements.map((statement) => env.DB.prepare(statement)))
    } catch (error) {
      throw new Error(`Migration ${name} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export interface TestUser {
  userId: string
  token: string
}

/** Creates a user row + a valid session token (bypasses magic-link email; that's Task 5.1). */
export async function seedUser(env: Env, email: string): Promise<TestUser> {
  const userId = crypto.randomUUID()
  await env.DB.prepare('INSERT INTO users (id, email) VALUES (?, ?)')
    .bind(userId, email)
    .run()

  const token = `test-token-${crypto.randomUUID()}`
  await env.SESSIONS.put(`session:${token}`, JSON.stringify({ userId }))

  return { userId, token }
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}
