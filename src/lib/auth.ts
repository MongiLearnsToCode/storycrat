import type { Env } from '../types'

/**
 * Session validation — the consuming half of magic-link auth (Task 5.1).
 * Every protected route resolves the caller through here; sessions live in
 * KV (PRD §7: KV is auth sessions/cache ONLY).
 *
 * Token format is opaque random bytes; the KV key namespace prefixes it so
 * other cached values can never collide with credentials.
 */
export const SESSION_COOKIE = 'storycrat_session'
const SESSION_KEY_PREFIX = 'session:'

export interface AuthenticatedUser {
  id: string
}

export function extractSessionToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    return token.length > 0 ? token : null
  }

  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [name, ...rest] = part.trim().split('=')
      if (name === SESSION_COOKIE && rest.length > 0) {
        const token = rest.join('=').trim()
        return token.length > 0 ? token : null
      }
    }
  }

  return null
}

/** Returns the authenticated user, or null when no valid session is presented. */
export async function requireUser(request: Request, env: Env): Promise<AuthenticatedUser | null> {
  const token = extractSessionToken(request)
  if (!token) return null

  const stored = await env.SESSIONS.get(`${SESSION_KEY_PREFIX}${token}`)
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored) as { userId?: unknown }
    if (typeof parsed.userId !== 'string' || parsed.userId.length === 0) return null
    return { id: parsed.userId }
  } catch {
    return null
  }
}

/** Creates a session for a verified user (called by the magic-link callback in Task 5.1). */
export async function createSession(env: Env, userId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  await env.SESSIONS.put(
    `${SESSION_KEY_PREFIX}${token}`,
    JSON.stringify({ userId, createdAt: new Date().toISOString() }),
    { expirationTtl: 60 * 60 * 24 * 30 }
  )
  return token
}
