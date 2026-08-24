import type { Env } from '../types'

/**
 * Guarded accessors for the remote-only bindings (Workers AI, Vectorize).
 *
 * Outside production (unit/integration tests, `wrangler dev` without remote
 * support), merely TOUCHING these bindings throws synchronously from
 * miniflare's remote-proxy. That throw escapes ordinary try/catch semantics
 * at the access site, so it must be contained here — callers get `null` and
 * degrade gracefully instead of crashing the request.
 */

export function safeAI(env: Env): Ai | null {
  try {
    return env.AI ?? null
  } catch {
    return null
  }
}

export function safeVectorIndex(env: Env): VectorizeIndex | null {
  try {
    return env.VECTOR_INDEX ?? null
  } catch {
    return null
  }
}
