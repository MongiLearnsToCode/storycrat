import type { Env } from '../types'
import type { RouteContext, Router } from '../index'
import { errorResponse, jsonResponse } from '../index'
import { requireUser } from '../lib/auth'
import { findScript, isOwned, notFound } from '../lib/ownership'

const ELEMENT_TYPES = ['scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'] as const
type ElementType = (typeof ELEMENT_TYPES)[number]

/** Route params are guaranteed present when the pattern matched; this satisfies strict index-access typing once, centrally. */
function p(ctx: RouteContext, name: 'scriptId' | 'elementId'): string {
  const value = ctx.params[name]
  if (value === undefined) throw new Error(`Missing route parameter: ${name}`)
  return value
}

export interface ScriptElementInput {
  type: unknown
  content: unknown
}

function isValidElementInput(el: ScriptElementInput): el is { type: ElementType; content: string } {
  return (
    typeof el.type === 'string' &&
    (ELEMENT_TYPES as readonly string[]).includes(el.type) &&
    typeof el.content === 'string'
  )
}

interface ElementRow {
  id: string
  script_id: string
  position: number
  type: ElementType
  content: string
}

/**
 * Full ordered replacement of a script's elements — the persistence path for
 * manual keyboard editing (Task 2.4). Positions are normalized 0..n-1 in the
 * given order; the write is one batch so readers never see a partial state.
 */
async function replaceElements(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findScript(ctx.env, p(ctx, 'scriptId'))
  if (!isOwned(owned, user.id)) return notFound()

  let body: { elements?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!Array.isArray(body.elements)) {
    return errorResponse('elements must be an array of { type, content }', 400)
  }
  if (body.elements.length > 5000) {
    return errorResponse('elements exceeds maximum of 5000', 400)
  }

  const inputs = body.elements as ScriptElementInput[]
  for (let i = 0; i < inputs.length; i++) {
    const el = inputs[i]
    if (!el || !isValidElementInput(el)) {
      return errorResponse(`element at index ${i} must have type in [${ELEMENT_TYPES.join(', ')}] and string content`, 400)
    }
  }

  const scriptId = p(ctx, 'scriptId')
  const statements = [
    ctx.env.DB.prepare('DELETE FROM script_elements WHERE script_id = ?').bind(scriptId),
    ...inputs.map((el, position) =>
      ctx.env.DB.prepare(
        'INSERT INTO script_elements (id, script_id, position, type, content) VALUES (?, ?, ?, ?, ?)'
      ).bind(crypto.randomUUID(), scriptId, position, el.type, el.content)
    ),
  ]
  await ctx.env.DB.batch(statements)

  return getElements(ctx)
}

async function getElements(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findScript(ctx.env, p(ctx, 'scriptId'))
  if (!isOwned(owned, user.id)) return notFound()

  const script = await ctx.env.DB.prepare(
    'SELECT id, project_id, episode_id, created_at, updated_at FROM scripts WHERE id = ?'
  )
    .bind(p(ctx, 'scriptId'))
    .first<{ id: string; project_id: string; episode_id: string | null; created_at: string; updated_at: string }>()
  if (!script) return notFound()

  const { results } = await ctx.env.DB.prepare(
    'SELECT id, script_id, position, type, content FROM script_elements WHERE script_id = ? ORDER BY position ASC'
  )
    .bind(p(ctx, 'scriptId'))
    .all<ElementRow>()

  return jsonResponse({ script, elements: results ?? [] })
}

/** Single-element edit: re-tag its type and/or change its content (manual correction UI path). */
async function updateElement(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findScript(ctx.env, p(ctx, 'scriptId'))
  if (!isOwned(owned, user.id)) return notFound()

  let body: { type?: unknown; content?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (body.type === undefined && body.content === undefined) {
    return errorResponse('Provide type and/or content to update', 400)
  }
  if (body.type !== undefined && !(typeof body.type === 'string' && (ELEMENT_TYPES as readonly string[]).includes(body.type))) {
    return errorResponse(`type must be one of [${ELEMENT_TYPES.join(', ')}]`, 400)
  }
  if (body.content !== undefined && typeof body.content !== 'string') {
    return errorResponse('content must be a string', 400)
  }

  const updates: string[] = []
  const bindings: (string | number)[] = []
  if (body.type !== undefined) {
    updates.push('type = ?')
    bindings.push(body.type as string)
  }
  if (body.content !== undefined) {
    updates.push('content = ?')
    bindings.push(body.content as string)
  }
  bindings.push(p(ctx, 'elementId'), p(ctx, 'scriptId'))

  const result = await ctx.env.DB.prepare(
    `UPDATE script_elements SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ? AND script_id = ?`
  )
    .bind(...bindings)
    .run()

  if ((result.meta.changes ?? 0) === 0) return notFound()

  const element = await ctx.env.DB.prepare('SELECT id, script_id, position, type, content FROM script_elements WHERE id = ?')
    .bind(p(ctx, 'elementId'))
    .first<ElementRow>()

  return jsonResponse({ element })
}

export function registerScriptRoutes(router: Router): void {
  router.get('/api/scripts/:scriptId', getElements)
  router.put('/api/scripts/:scriptId/elements', replaceElements)
  router.patch('/api/scripts/:scriptId/elements/:elementId', updateElement)
}
