import type { Env } from '../types'
import type { RouteContext, Router } from '../index'
import { errorResponse, jsonResponse } from '../index'
import { requireUser } from '../lib/auth'
import { findScript, isOwned, notFound } from '../lib/ownership'
import { getSessionStateStub } from '../durable-objects/session-id'

/**
 * Dictation WebSocket entry (Task 3.1).
 *
 * Auth + ownership happen HERE, before the upgrade is forwarded to this
 * user's SessionState DO. The DO is addressed by an ID derived from the
 * authenticated user's ID — a client can never pick or guess another
 * writer's session object (security-doc.md § Authorization & Data Isolation).
 */
async function openDictationSession(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const scriptId = ctx.url.searchParams.get('scriptId')
  if (!scriptId) return errorResponse('scriptId query parameter required', 400)

  const owned = await findScript(ctx.env, scriptId)
  if (!isOwned(owned, user.id)) return notFound()

  const stub = getSessionStateStub(ctx.env, user.id, scriptId)
  // Forward the upgrade — audio relay and buffering live in the DO.
  return stub.fetch(ctx.request)
}

/** Explicit stop flush (also used when a client closes uncleanly). */
async function flushDictation(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const body = (await ctx.request.json().catch(() => ({}))) as { scriptId?: unknown }
  if (typeof body.scriptId !== 'string') return errorResponse('scriptId required', 400)

  const owned = await findScript(ctx.env, body.scriptId)
  if (!isOwned(owned, user.id)) return notFound()

  const stub = getSessionStateStub(ctx.env, user.id, body.scriptId)
  await stub.fetch(new URL('/flush', ctx.url).href, { method: 'POST' })
  return jsonResponse({ ok: true })
}

export function registerDictationRoutes(router: Router): void {
  router.get('/api/dictation', openDictationSession)
  router.post('/api/dictation/stop', flushDictation)
}
