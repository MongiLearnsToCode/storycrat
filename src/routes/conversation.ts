import type { Env } from '../types'
import type { RouteContext, Router } from '../index'
import { errorResponse, jsonResponse } from '../index'
import { requireUser } from '../lib/auth'
import { findEpisode, findProject, isOwned, notFound } from '../lib/ownership'
import { runLlm } from '../lib/llm-router'
import { retrievePassages } from '../lib/rag-retrieval'
import { assembleSystemPrompt, buildMessages, extractCitations } from '../lib/conversation-engine'

/**
 * Conversation mode + Get Notes (Tasks 4.1–4.6, 4.11).
 *
 * SECURITY/BOUNDARIES:
 * - Every route verifies the caller owns the project/episode/conversation.
 * - NOTHING in this module writes to script_elements (PRD Req 25) — the only
 *   tables touched are conversations and messages.
 * - Conversation-mode requests are rate-limited per user (security-doc.md
 *   § Abuse & Rate Limiting); Get Notes counts against the same budget.
 */

const RATE_LIMIT_PER_MINUTE = 20

async function checkRateLimit(env: Env, userId: string): Promise<boolean> {
  const window = Math.floor(Date.now() / 60_000)
  const key = `ratelimit:${userId}:${window}`
  const current = Number((await env.SESSIONS.get(key)) ?? '0')
  if (current >= RATE_LIMIT_PER_MINUTE) return false
  // Best-effort increment; KV's eventual consistency is acceptable for a
  // cost guard rather than a security boundary.
  await env.SESSIONS.put(key, String(current + 1), { expirationTtl: 120 })
  return true
}

interface ProjectContext {
  projectId: string
  ownerId: string
}

async function loadProjectContext(ctx: RouteContext): Promise<ProjectContext | null> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return null

  const projectId = ctx.params.projectId
  if (!projectId) return null
  const owned = await findProject(ctx.env, projectId)
  if (!isOwned(owned, user.id)) return null
  return { projectId, ownerId: user.id }
}

async function resolveEpisodeScope(
  env: Env,
  projectId: string,
  episodeId: string | undefined
): Promise<{ seasonId: string; episodeId: string; scriptId: string } | null> {
  if (!episodeId) {
    // Feature scope: the project's direct script.
    const script = await env.DB.prepare('SELECT id FROM scripts WHERE project_id = ? AND episode_id IS NULL')
      .bind(projectId)
      .first<{ id: string }>()
    return script ? { seasonId: '', episodeId: '', scriptId: script.id } : null
  }

  const row = await env.DB.prepare(
    `SELECT e.season_id, sc.id AS script_id FROM episodes e LEFT JOIN scripts sc ON sc.episode_id = e.id WHERE e.id = ? AND e.season_id IN (SELECT id FROM seasons WHERE project_id = ?)`
  )
    .bind(episodeId, projectId)
    .first<{ season_id: string; script_id: string | null }>()
  if (!row) return null
  return { seasonId: row.season_id, episodeId, scriptId: row.script_id ?? '' }
}

async function getOrCreateConversation(env: Env, projectId: string, kind: 'chat' | 'notes', episodeId: string | null): Promise<string> {
  const existing = await env.DB.prepare(
    'SELECT id FROM conversations WHERE project_id = ? AND kind = ? AND episode_id IS ? ORDER BY created_at DESC LIMIT 1'
  )
    .bind(projectId, kind, episodeId)
    .first<{ id: string }>()
  if (existing) return existing.id

  const id = crypto.randomUUID()
  await env.DB.prepare('INSERT INTO conversations (id, project_id, kind, episode_id) VALUES (?, ?, ?, ?)')
    .bind(id, projectId, kind, episodeId)
    .run()
  return id
}

/** Focus text = the material directly in front of the writer (loaded directly, never via retrieval alone). */
async function loadFocusText(env: Env, scriptId: string): Promise<string> {
  if (!scriptId) return ''
  const { results } = await env.DB.prepare(
    'SELECT type, content FROM script_elements WHERE script_id = ? ORDER BY position ASC'
  )
    .bind(scriptId)
    .all<{ type: string; content: string }>()
  return (results ?? []).map((el) => `${el.type === 'scene_heading' ? '\n' : ''}${el.content}`).join('\n')
}

async function loadStoryBible(env: Env, seasonId: string): Promise<string> {
  if (!seasonId) return ''
  const row = await env.DB.prepare('SELECT content FROM story_bibles WHERE season_id = ?').bind(seasonId).first<{ content: string }>()
  return row?.content ?? ''
}

async function loadHistory(env: Env, conversationId: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { results } = await env.DB.prepare(
    "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
  )
    .bind(conversationId)
    .all<{ role: string; content: string }>()
  return (results ?? [])
    .filter((r) => r.role === 'user' || r.role === 'assistant')
    .map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }))
}

/**
 * POST /api/projects/:projectId/chat  { question, episodeId?, conversationId? }
 * Full conversation turn: assemble → critique → persist both turns.
 */
async function chat(ctx: RouteContext): Promise<Response> {
  const context = await loadProjectContext(ctx)
  if (!context) {
    const authed = await requireUser(ctx.request, ctx.env)
    return authed ? notFound() : errorResponse('Unauthorized', 401)
  }

  // Cheap validation first; the rate limiter counts only real AI-bound work.
  let body: { question?: unknown; episodeId?: unknown; conversationId?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }
  if (typeof body.question !== 'string' || !body.question.trim()) {
    return errorResponse('question required', 400)
  }

  if (!(await checkRateLimit(ctx.env, context.ownerId))) {
    return errorResponse('AI rate limit reached — try again in a minute.', 429)
  }
  const episodeId = typeof body.episodeId === 'string' && body.episodeId ? body.episodeId : null

  const scope = await resolveEpisodeScope(ctx.env, context.projectId, episodeId ?? undefined)

  const conversationId =
    typeof body.conversationId === 'string' && body.conversationId
      ? await (async () => {
          const row = await ctx.env.DB.prepare('SELECT id FROM conversations WHERE id = ? AND project_id = ?')
            .bind(body.conversationId, context.projectId)
            .first<{ id: string }>()
          return row?.id ?? (await getOrCreateConversation(ctx.env, context.projectId, 'chat', episodeId))
        })()
      : await getOrCreateConversation(ctx.env, context.projectId, 'chat', episodeId)

  // Assemble: focus scenes + bible + history + RAG supplement.
  const focusText = scope?.scriptId ? await loadFocusText(ctx.env, scope.scriptId) : ''
  const storyBible = scope?.seasonId ? await loadStoryBible(ctx.env, scope.seasonId) : ''
  const history = await loadHistory(ctx.env, conversationId)
  const passages = await retrievePassages(
    ctx.env,
    { accountId: context.ownerId, projectId: context.projectId },
    body.question,
    { topK: 8, excludeScriptId: scope?.scriptId || undefined }
  )

  const systemPrompt = await assembleSystemPrompt(ctx.env, { focusText, storyBible, history, passages })
  const messages = buildMessages(systemPrompt, history, body.question)

  let reply: string
  try {
    reply = await runLlm(ctx.env, 'critique', messages, { temperature: 0.7, maxTokens: 1500 })
  } catch (error) {
    console.error('Conversation LLM call failed', error)
    return errorResponse('The AI is unavailable right now — try again shortly.', 503)
  }

  const citations = extractCitations(reply, passages)

  await ctx.env.DB.batch([
    ctx.env.DB.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').bind(
      crypto.randomUUID(),
      conversationId,
      'user',
      body.question
    ),
    ctx.env.DB.prepare('INSERT INTO messages (id, conversation_id, role, content, citations) VALUES (?, ?, ?, ?, ?)').bind(
      crypto.randomUUID(),
      conversationId,
      'assistant',
      reply,
      JSON.stringify(citations)
    ),
  ])

  return jsonResponse({ conversationId, reply: { role: 'assistant', content: reply, citations } }, 201)
}

/** GET /api/projects/:projectId/conversations/:conversationId/messages — scroll-back. */
async function history(ctx: RouteContext): Promise<Response> {
  const context = await loadProjectContext(ctx)
  if (!context) {
    const authed = await requireUser(ctx.request, ctx.env)
    return authed ? notFound() : errorResponse('Unauthorized', 401)
  }

  const conversation = await ctx.env.DB.prepare('SELECT id FROM conversations WHERE id = ? AND project_id = ?')
    .bind(ctx.params.conversationId, context.projectId)
    .first<{ id: string }>()
  if (!conversation) return notFound()

  const { results } = await ctx.env.DB.prepare(
    'SELECT role, content, citations, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  )
    .bind(conversation.id)
    .all<{ role: string; content: string; citations: string; created_at: string }>()

  return jsonResponse({
    messages: (results ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      citations: m.citations ? (JSON.parse(m.citations) as unknown[]) : [],
      createdAt: m.created_at,
    })),
  })
}

/**
 * POST /api/projects/:projectId/notes { episodeId? } — Get Notes (Task 4.11):
 * same assembly engine as chat, one-shot response rendered as a static panel,
 * persisted under a 'notes' conversation for the record.
 */
async function getNotes(ctx: RouteContext): Promise<Response> {
  const context = await loadProjectContext(ctx)
  if (!context) {
    const authed = await requireUser(ctx.request, ctx.env)
    return authed ? notFound() : errorResponse('Unauthorized', 401)
  }
  if (!(await checkRateLimit(ctx.env, context.ownerId))) {
    return errorResponse('AI rate limit reached — try again in a minute.', 429)
  }

  let body: { episodeId?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    body = {}
  }
  const episodeId = typeof body.episodeId === 'string' && body.episodeId ? body.episodeId : null

  const scope = await resolveEpisodeScope(ctx.env, context.projectId, episodeId ?? undefined)
  if (!scope?.scriptId) return notFound()

  const focusText = await loadFocusText(ctx.env, scope.scriptId)
  const storyBible = scope.seasonId ? await loadStoryBible(ctx.env, scope.seasonId) : ''
  const passages = await retrievePassages(
    ctx.env,
    { accountId: context.ownerId, projectId: context.projectId },
    `Notes on this ${episodeId ? 'episode' : 'script'}: structure, character, dialogue weaknesses`,
    { topK: 8 }
  )
  void episodeId

  const systemPrompt = await assembleSystemPrompt(ctx.env, { focusText, storyBible, history: [], passages })

  let notes: string
  try {
    notes = await runLlm(
      ctx.env,
      'critique',
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            'Give me your notes on this material: the 3–5 most important problems worth fixing, each with a specific reference to what you read and why it works against the writer’s intent.',
        },
      ],
      { temperature: 0.5, maxTokens: 1800 }
    )
  } catch (error) {
    console.error('Get Notes LLM call failed', error)
    return errorResponse('The AI is unavailable right now — try again shortly.', 503)
  }

  const citations = extractCitations(notes, passages)
  const conversationId = await getOrCreateConversation(ctx.env, context.projectId, 'notes', episodeId)

  await ctx.env.DB.batch([
    ctx.env.DB.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)").bind(
      crypto.randomUUID(),
      conversationId,
      '(Get Notes request)'
    ),
    ctx.env.DB.prepare('INSERT INTO messages (id, conversation_id, role, content, citations) VALUES (?, ?, ?, ?, ?)').bind(
      crypto.randomUUID(),
      conversationId,
      'assistant',
      notes,
      JSON.stringify(citations)
    ),
  ])

  return jsonResponse({ notes, citations }, 201)
}

// Exported for direct-handler testing.
export { chat, history as getConversationHistory, getNotes }

export function registerConversationRoutes(router: Router): void {
  router.post('/api/projects/:projectId/chat', chat)
  router.post('/api/projects/:projectId/notes', getNotes)
  router.get('/api/projects/:projectId/conversations/:conversationId/messages', history)
}
