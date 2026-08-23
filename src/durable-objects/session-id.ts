import type { Env } from '../types'

/**
 * Derives a tenant-scoped Durable Object ID from the authenticated user and
 * the resource the session is attached to (script or episode ID).
 *
 * SECURITY: this is the ONLY sanctioned way to obtain a SessionState stub.
 * The name embeds the user ID, so one writer can never land on another
 * writer's session object even with full knowledge of resource IDs.
 */
export function getSessionStateId(env: Env, userId: string, resourceId: string): DurableObjectId {
  return env.SESSION_STATE.idFromName(`u:${userId}:r:${resourceId}`)
}

export function getSessionStateStub(env: Env, userId: string, resourceId: string): DurableObjectStub {
  return env.SESSION_STATE.get(getSessionStateId(env, userId, resourceId))
}
