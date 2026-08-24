import type { Env } from '../types'
import type { RouteContext, Router } from '../index'
import { errorResponse, jsonResponse } from '../index'
import { requireUser } from '../lib/auth'
import { findScript, isOwned, notFound } from '../lib/ownership'
import { generateScriptPdf } from '../lib/pdf-export'
import { createSignedDownloadLink, verifySignedDownload } from '../lib/signed-urls'
import { runLlmSingleTurn } from '../lib/llm-router'
import { resyncScriptSafely } from '../lib/embed-sync'
import { deleteScriptEmbeddings } from '../lib/embeddings'

/**
 * Inline AI suggestion (Task 3.11, PRD Req 19).
 *
 * STRICTLY user-initiated (writer clicks ✦ on one element) and strictly
 * scoped to ONE line — never a scene, page, or draft (PRD §5 Non-Goals).
 * The response is a proposal only; insertion requires the writer's explicit
 * acceptance in the UI. There is no code path here that writes to the script.
 */
const SUGGEST_SYSTEM_PROMPT = `You are a sharp, economical screenwriting partner. The writer selects ONE line and asks for a stronger alternative.
Rules:
- Reply with ONLY the rewritten line — no quotes, no explanation, no preamble.
- Improve specificity, economy, or subtext. Never lengthen dialogue padding.
- Never add new scenes, directions beyond the line's own scope, or content the writer did not write.
- If the line is already tight, return it unchanged.`

async function suggest(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findScript(ctx.env, p(ctx, 'scriptId'))
  if (!isOwned(owned, user.id)) return notFound()

  let body: { elementId?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }
  if (typeof body.elementId !== 'string') return errorResponse('elementId required', 400)

  const element = await ctx.env.DB.prepare('SELECT id, type, content FROM script_elements WHERE id = ? AND script_id = ?')
    .bind(body.elementId, p(ctx, 'scriptId'))
    .first<{ id: string; type: string; content: string }>()
  if (!element || !element.content.trim()) return notFound()

  try {
    const suggestion = await runLlmSingleTurn(
      ctx.env,
      'critique',
      SUGGEST_SYSTEM_PROMPT,
      `Line type: ${element.type}\nLine: ${element.content}`
    )
    return jsonResponse({ suggestion: suggestion.trim() })
  } catch (error) {
    console.error('Suggestion failed', error)
    return errorResponse('Suggestion unavailable right now', 503)
  }
}

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
  ctx.waitUntil?.(resyncScriptSafely(ctx.env, scriptId))

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

/** Streams the script as an industry-standard PDF derived from its structured elements (Task 2.7). */
async function exportPdf(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findScript(ctx.env, p(ctx, 'scriptId'))
  if (!isOwned(owned, user.id)) return notFound()

  const { results } = await ctx.env.DB.prepare(
    'SELECT type, content FROM script_elements WHERE script_id = ? ORDER BY position ASC'
  )
    .bind(p(ctx, 'scriptId'))
    .all<{ type: Parameters<typeof generateScriptPdf>[1][number]['type']; content: string }>()

  try {
    const { bytes } = await generateScriptPdf('Screenplay', results ?? [])
    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="screenplay.pdf"',
      },
    })
  } catch (error) {
    console.error('PDF generation failed', error)
    return errorResponse('PDF generation failed', 500)
  }
}

/**
 * Generates the PDF, persists it to R2 (PDFs ONLY — never audio or
 * transcripts, PRD §7), and returns a short-lived signed download link.
 */
async function exportToStorage(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const scriptId = p(ctx, 'scriptId')
  const owned = await findScript(ctx.env, scriptId)
  if (!isOwned(owned, user.id)) return notFound()

  const { results } = await ctx.env.DB.prepare(
    'SELECT type, content FROM script_elements WHERE script_id = ? ORDER BY position ASC'
  )
    .bind(scriptId)
    .all<{ type: Parameters<typeof generateScriptPdf>[1][number]['type']; content: string }>()

  let bytes: Uint8Array
  try {
    ;({ bytes } = await generateScriptPdf('Screenplay', results ?? []))
  } catch (error) {
    console.error('PDF generation failed', error)
    return errorResponse('PDF generation failed', 500)
  }

  const objectKey = `pdfs/${scriptId}/${crypto.randomUUID()}.pdf`
  await ctx.env.PDFS.put(objectKey, bytes as unknown as ArrayBuffer, {
    httpMetadata: { contentType: 'application/pdf' },
  })

  const link = await createSignedDownloadLink(ctx.env, objectKey, 300)

  return jsonResponse(
    {
      objectKey,
      downloadUrl: link.path,
      expiresAt: new Date(link.expiresAt).toISOString(),
    },
    201
  )
}

/** Streams an exported PDF for a valid, unexpired signed link. */
async function downloadExport(ctx: RouteContext): Promise<Response> {
  const verified = await verifySignedDownload(ctx.request, ctx.env)
  if (!verified) return errorResponse('Invalid or expired download link', 403)

  const object = await ctx.env.PDFS.get(verified.objectKey)
  if (!object) return notFound()

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/pdf',
      'Content-Disposition': 'attachment',
      'Cache-Control': 'private, no-store',
    },
  })
}

export function registerScriptRoutes(router: Router): void {
  router.get('/api/scripts/:scriptId', getElements)
  router.put('/api/scripts/:scriptId/elements', replaceElements)
  router.patch('/api/scripts/:scriptId/elements/:elementId', updateElement)
  router.get('/api/scripts/:scriptId/pdf', exportPdf)
  router.post('/api/scripts/:scriptId/suggest', suggest)
  router.post('/api/scripts/:scriptId/exports', exportToStorage)
  router.get('/api/exports/*', downloadExport)
}
