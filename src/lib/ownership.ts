import type { Env } from '../types'
import { errorResponse } from '../index'

/**
 * Ownership verification (security-doc.md § Authorization & Data Isolation).
 * Every read/write of a Project, Season, Episode, or Script goes through one
 * of these checks. Not-owned resources return 404 — never 403 — so the API
 * does not leak which IDs exist.
 */

interface OwnedRow {
  owner_user_id: string
}

export async function findProject(env: Env, projectId: string): Promise<OwnedRow | null> {
  const row = await env.DB.prepare('SELECT owner_user_id FROM projects WHERE id = ?')
    .bind(projectId)
    .first<OwnedRow>()
  return row ?? null
}

export async function findSeason(
  env: Env,
  seasonId: string
): Promise<{ owner_user_id: string; project_id: string } | null> {
  const row = await env.DB.prepare(
    `SELECT p.owner_user_id, s.project_id FROM seasons s JOIN projects p ON p.id = s.project_id WHERE s.id = ?`
  )
    .bind(seasonId)
    .first<{ owner_user_id: string; project_id: string }>()
  return row ?? null
}

export async function findEpisode(
  env: Env,
  episodeId: string
): Promise<{ owner_user_id: string; project_id: string; season_id: string } | null> {
  const row = await env.DB.prepare(
    `SELECT p.owner_user_id, s.project_id, e.season_id
     FROM episodes e
     JOIN seasons s ON s.id = e.season_id
     JOIN projects p ON p.id = s.project_id
     WHERE e.id = ?`
  )
    .bind(episodeId)
    .first<{ owner_user_id: string; project_id: string; season_id: string }>()
  return row ?? null
}

export async function findScript(
  env: Env,
  scriptId: string
): Promise<{ owner_user_id: string; project_id: string; episode_id: string | null } | null> {
  const row = await env.DB.prepare(
    `SELECT p.owner_user_id, sc.project_id, sc.episode_id
     FROM scripts sc JOIN projects p ON p.id = sc.project_id
     WHERE sc.id = ?`
  )
    .bind(scriptId)
    .first<{ owner_user_id: string; project_id: string; episode_id: string | null }>()
  return row ?? null
}

/** Uniform "not yours / doesn't exist" response. */
export function notFound(): Response {
  return errorResponse('Not found', 404)
}

export function isOwned(row: { owner_user_id: string } | null, userId: string): boolean {
  return row !== null && row.owner_user_id === userId
}
