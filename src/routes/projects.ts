import type { Env } from '../types'
import type { RouteContext, Router } from '../index'
import { errorResponse, jsonResponse } from '../index'
import { requireUser } from '../lib/auth'
import { resyncScriptSafely } from '../lib/embed-sync'
import { deleteScriptEmbeddings } from '../lib/embeddings'
import { findEpisode, findProject, findSeason, isOwned, notFound } from '../lib/ownership'

const TITLE_MAX = 200

/** Route params are guaranteed present when the pattern matched; this satisfies strict index-access typing once, centrally. */
function p(ctx: RouteContext, name: 'projectId' | 'seasonId' | 'episodeId'): string {
  const value = ctx.params[name]
  if (value === undefined) throw new Error(`Missing route parameter: ${name}`)
  return value
}

function newId(): string {
  return crypto.randomUUID()
}

function isValidTitle(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= TITLE_MAX
}

interface ProjectRow {
  id: string
  title: string
  type: 'feature' | 'series'
  created_at: string
  updated_at: string
}

async function listProjects(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const { results } = await ctx.env.DB.prepare(
    'SELECT id, title, type, created_at, updated_at FROM projects WHERE owner_user_id = ? ORDER BY created_at DESC'
  )
    .bind(user.id)
    .all<ProjectRow>()

  return jsonResponse({ projects: results ?? [] })
}

async function createProject(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  let body: { title?: unknown; type?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!isValidTitle(body.title)) {
    return errorResponse(`title must be a non-empty string of at most ${TITLE_MAX} characters`, 400)
  }
  if (body.type !== 'feature' && body.type !== 'series') {
    return errorResponse("type must be 'feature' or 'series'", 400)
  }

  const projectId = newId()
  const now = new Date().toISOString()

  // Feature projects get their (single) script immediately; series projects
  // get scripts per episode at episode-creation time.
  const statements = [
    ctx.env.DB.prepare('INSERT INTO projects (id, owner_user_id, title, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(
      projectId,
      user.id,
      body.title.trim(),
      body.type,
      now,
      now
    ),
  ]
  if (body.type === 'feature') {
    statements.push(
      ctx.env.DB.prepare('INSERT INTO scripts (id, project_id, created_at, updated_at) VALUES (?, ?, ?, ?)').bind(
        newId(),
        projectId,
        now,
        now
      )
    )
  }
  await ctx.env.DB.batch(statements)

  const project = await ctx.env.DB.prepare('SELECT id, title, type, created_at, updated_at FROM projects WHERE id = ?')
    .bind(projectId)
    .first<ProjectRow>()

  return jsonResponse({ project }, 201)
}

async function getProject(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findProject(ctx.env, p(ctx, 'projectId'))
  if (!isOwned(owned, user.id)) return notFound()

  const project = await ctx.env.DB.prepare('SELECT id, title, type, created_at, updated_at FROM projects WHERE id = ?')
    .bind(p(ctx, 'projectId'))
    .first<ProjectRow>()
  if (!project) return notFound()

  const featureScript = await ctx.env.DB.prepare('SELECT id FROM scripts WHERE project_id = ? AND episode_id IS NULL')
    .bind(p(ctx, 'projectId'))
    .first<{ id: string }>()

  return jsonResponse({ project, featureScriptId: featureScript?.id ?? null })
}

async function updateProject(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findProject(ctx.env, p(ctx, 'projectId'))
  if (!isOwned(owned, user.id)) return notFound()

  let body: { title?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }
  if (!isValidTitle(body.title)) {
    return errorResponse(`title must be a non-empty string of at most ${TITLE_MAX} characters`, 400)
  }

  await ctx.env.DB.prepare("UPDATE projects SET title = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(body.title.trim(), p(ctx, 'projectId'))
    .run()

  return jsonResponse({ ok: true })
}

async function deleteProject(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findProject(ctx.env, p(ctx, 'projectId'))
  if (!isOwned(owned, user.id)) return notFound()

  const projectScripts = await ctx.env.DB.prepare('SELECT id FROM scripts WHERE project_id = ?')
    .bind(p(ctx, 'projectId'))
    .all<{ id: string }>()
  for (const script of projectScripts.results ?? []) {
    ctx.waitUntil?.(deleteScriptEmbeddings(ctx.env, script.id))
  }

  await ctx.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(p(ctx, 'projectId')).run()
  return jsonResponse({ ok: true })
}

interface SeasonRow {
  id: string
  project_id: string
  season_number: number
  title: string
  created_at: string
  updated_at: string
}

async function listSeasons(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findProject(ctx.env, p(ctx, 'projectId'))
  if (!isOwned(owned, user.id)) return notFound()

  const { results } = await ctx.env.DB.prepare(
    'SELECT id, project_id, season_number, title, created_at, updated_at FROM seasons WHERE project_id = ? ORDER BY season_number ASC'
  )
    .bind(p(ctx, 'projectId'))
    .all<SeasonRow>()

  return jsonResponse({ seasons: results ?? [] })
}

async function createSeason(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findProject(ctx.env, p(ctx, 'projectId'))
  if (!isOwned(owned, user.id)) return notFound()

  const projectType = await ctx.env.DB.prepare('SELECT type FROM projects WHERE id = ?')
    .bind(p(ctx, 'projectId'))
    .first<{ type: 'feature' | 'series' }>()
  if (projectType?.type !== 'series') {
    return errorResponse('Seasons can only be added to series projects', 400)
  }

  let body: { title?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    body = {}
  }
  if (body.title !== undefined && !isValidTitle(body.title)) {
    return errorResponse(`title must be a non-empty string of at most ${TITLE_MAX} characters`, 400)
  }

  const next = await ctx.env.DB.prepare('SELECT COALESCE(MAX(season_number), 0) + 1 AS n FROM seasons WHERE project_id = ?')
    .bind(p(ctx, 'projectId'))
    .first<{ n: number }>()
  const seasonNumber = next?.n ?? 1

  const seasonId = newId()
  const now = new Date().toISOString()
  await ctx.env.DB.prepare(
    'INSERT INTO seasons (id, project_id, season_number, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(seasonId, p(ctx, 'projectId'), seasonNumber, typeof body.title === 'string' ? body.title.trim() : '', now, now)
    .run()

  const season = await ctx.env.DB.prepare(
    'SELECT id, project_id, season_number, title, created_at, updated_at FROM seasons WHERE id = ?'
  )
    .bind(seasonId)
    .first<SeasonRow>()

  return jsonResponse({ season }, 201)
}

async function updateSeason(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findSeason(ctx.env, p(ctx, 'seasonId'))
  if (!isOwned(owned, user.id)) return notFound()

  let body: { title?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }
  if (!isValidTitle(body.title)) {
    return errorResponse(`title must be a non-empty string of at most ${TITLE_MAX} characters`, 400)
  }

  await ctx.env.DB.prepare("UPDATE seasons SET title = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(body.title.trim(), p(ctx, 'seasonId'))
    .run()

  return jsonResponse({ ok: true })
}

async function deleteSeason(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findSeason(ctx.env, p(ctx, 'seasonId'))
  if (!isOwned(owned, user.id)) return notFound()

  await ctx.env.DB.prepare('DELETE FROM seasons WHERE id = ?').bind(p(ctx, 'seasonId')).run()
  return jsonResponse({ ok: true })
}

interface EpisodeRow {
  id: string
  season_id: string
  episode_number: number
  title: string
  script_id: string | null
  created_at: string
  updated_at: string
}

const EPISODE_SELECT = `
  SELECT e.id, e.season_id, e.episode_number, e.title, e.created_at, e.updated_at, sc.id AS script_id
  FROM episodes e LEFT JOIN scripts sc ON sc.episode_id = e.id`

async function listEpisodes(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findSeason(ctx.env, p(ctx, 'seasonId'))
  if (!isOwned(owned, user.id)) return notFound()

  const { results } = await ctx.env.DB.prepare(`${EPISODE_SELECT} WHERE e.season_id = ? ORDER BY e.episode_number ASC`)
    .bind(p(ctx, 'seasonId'))
    .all<EpisodeRow>()

  return jsonResponse({ episodes: results ?? [] })
}

/**
 * Creating an episode provisions its empty script in the same transaction:
 * an episode without a script is not a valid state in this product.
 * NOTE (Task 5.3): the free-tier one-episode gate hooks in here.
 */
async function createEpisode(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findSeason(ctx.env, p(ctx, 'seasonId'))
  if (!isOwned(owned, user.id)) return notFound()

  let body: { title?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    body = {}
  }
  if (body.title !== undefined && !isValidTitle(body.title)) {
    return errorResponse(`title must be a non-empty string of at most ${TITLE_MAX} characters`, 400)
  }

  const next = await ctx.env.DB.prepare('SELECT COALESCE(MAX(episode_number), 0) + 1 AS n FROM episodes WHERE season_id = ?')
    .bind(p(ctx, 'seasonId'))
    .first<{ n: number }>()
  const episodeNumber = next?.n ?? 1

  const episodeId = newId()
  const scriptId = newId()
  const now = new Date().toISOString()

  await ctx.env.DB.batch([
    ctx.env.DB.prepare(
      'INSERT INTO episodes (id, season_id, episode_number, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(episodeId, p(ctx, 'seasonId'), episodeNumber, typeof body.title === 'string' ? body.title.trim() : '', now, now),
    ctx.env.DB.prepare('INSERT INTO scripts (id, project_id, episode_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(
      scriptId,
      owned?.project_id ?? '',
      episodeId,
      now,
      now
    ),
  ])

  const episode = await ctx.env.DB.prepare(`${EPISODE_SELECT} WHERE e.id = ?`).bind(episodeId).first<EpisodeRow>()

  return jsonResponse({ episode }, 201)
}

async function updateEpisode(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findEpisode(ctx.env, p(ctx, 'episodeId'))
  if (!isOwned(owned, user.id)) return notFound()

  let body: { title?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }
  if (!isValidTitle(body.title)) {
    return errorResponse(`title must be a non-empty string of at most ${TITLE_MAX} characters`, 400)
  }

  await ctx.env.DB.prepare("UPDATE episodes SET title = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(body.title.trim(), p(ctx, 'episodeId'))
    .run()

  return jsonResponse({ ok: true })
}

async function deleteEpisode(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findEpisode(ctx.env, p(ctx, 'episodeId'))
  if (!isOwned(owned, user.id)) return notFound()

  // Purge vectors for the episode's script before the cascade removes it.
  const episodeScript = await ctx.env.DB.prepare('SELECT id FROM scripts WHERE episode_id = ?')
    .bind(p(ctx, 'episodeId'))
    .first<{ id: string }>()
  if (episodeScript) {
    ctx.waitUntil?.(deleteScriptEmbeddings(ctx.env, episodeScript.id))
  }

  await ctx.env.DB.prepare('DELETE FROM episodes WHERE id = ?').bind(p(ctx, 'episodeId')).run()
  return jsonResponse({ ok: true })
}

/** Returns the script ID for a project's feature script, or null when absent/not owned. */
export async function findFeatureScript(env: Env, projectId: string, userId: string): Promise<string | null> {
  const owned = await findProject(env, projectId)
  if (!isOwned(owned, userId)) return null

  const row = await env.DB.prepare('SELECT id FROM scripts WHERE project_id = ? AND episode_id IS NULL')
    .bind(projectId)
    .first<{ id: string }>()
  return row?.id ?? null
}

interface BibleRow {
  id: string
  season_id: string
  content: string
  updated_at: string
}

async function getStoryBible(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findSeason(ctx.env, p(ctx, 'seasonId'))
  if (!isOwned(owned, user.id)) return notFound()

  // Every season has exactly one bible row conceptually; materialize lazily on first read.
  const existing = await ctx.env.DB.prepare('SELECT id, season_id, content, updated_at FROM story_bibles WHERE season_id = ?')
    .bind(p(ctx, 'seasonId'))
    .first<BibleRow>()
  if (existing) return jsonResponse({ storyBible: existing })

  const id = newId()
  await ctx.env.DB.prepare('INSERT INTO story_bibles (id, season_id) VALUES (?, ?)').bind(id, p(ctx, 'seasonId')).run()
  const created = await ctx.env.DB.prepare('SELECT id, season_id, content, updated_at FROM story_bibles WHERE id = ?')
    .bind(id)
    .first<BibleRow>()
  return jsonResponse({ storyBible: created })
}

const BIBLE_MAX_CHARS = 200_000

async function putStoryBible(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const owned = await findSeason(ctx.env, p(ctx, 'seasonId'))
  if (!isOwned(owned, user.id)) return notFound()

  let body: { content?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }
  if (typeof body.content !== 'string') {
    return errorResponse('content must be a string', 400)
  }
  if (body.content.length > BIBLE_MAX_CHARS) {
    return errorResponse(`content exceeds maximum of ${BIBLE_MAX_CHARS} characters`, 400)
  }

  // Upsert by unique season_id.
  await ctx.env.DB.prepare(
    `INSERT INTO story_bibles (id, season_id, content) VALUES (?, ?, ?)
     ON CONFLICT(season_id) DO UPDATE SET content = excluded.content, updated_at = datetime('now')`
  )
    .bind(newId(), p(ctx, 'seasonId'), body.content)
    .run()

  const row = await ctx.env.DB.prepare('SELECT id, season_id, content, updated_at FROM story_bibles WHERE season_id = ?')
    .bind(p(ctx, 'seasonId'))
    .first<BibleRow>()
  return jsonResponse({ storyBible: row })
}

export function registerProjectRoutes(router: Router): void {
  router.get('/api/projects', listProjects)
  router.post('/api/projects', createProject)
  router.get('/api/projects/:projectId', getProject)
  router.patch('/api/projects/:projectId', updateProject)
  router.delete('/api/projects/:projectId', deleteProject)

  router.get('/api/projects/:projectId/seasons', listSeasons)
  router.post('/api/projects/:projectId/seasons', createSeason)
  router.patch('/api/projects/:projectId/seasons/:seasonId', updateSeason)
  router.delete('/api/projects/:projectId/seasons/:seasonId', deleteSeason)

  router.get('/api/projects/:projectId/seasons/:seasonId/episodes', listEpisodes)
  router.post('/api/projects/:projectId/seasons/:seasonId/episodes', createEpisode)
  router.patch('/api/projects/:projectId/seasons/:seasonId/episodes/:episodeId', updateEpisode)
  router.delete('/api/projects/:projectId/seasons/:seasonId/episodes/:episodeId', deleteEpisode)

  router.get('/api/projects/:projectId/seasons/:seasonId/story-bible', getStoryBible)
  router.put('/api/projects/:projectId/seasons/:seasonId/story-bible', putStoryBible)
  // Bible access is scoped by the season itself (ownership chains
  // season → project → owner), so no project ID is required in the path.
  router.get('/api/seasons/:seasonId/story-bible', getStoryBible)
  router.put('/api/seasons/:seasonId/story-bible', putStoryBible)
}
