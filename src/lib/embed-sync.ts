import type { Env } from '../types'
import { syncScriptEmbeddings } from './embeddings'

/**
 * Resolves the tenant scope for a script's vectors by joining its placement
 * (feature → project; episode → season → project).
 */
export async function resolveEmbedScope(
  env: Env,
  scriptId: string
): Promise<{ accountId: string; projectId: string; seasonId: string | null; episodeId: string | null; scriptId: string } | null> {
  const row = await env.DB.prepare(
    `SELECT p.owner_user_id AS account_id,
            sc.project_id,
            sc.episode_id,
            e.season_id
     FROM scripts sc
     JOIN projects p ON p.id = sc.project_id
     LEFT JOIN episodes e ON e.id = sc.episode_id
     WHERE sc.id = ?`
  )
    .bind(scriptId)
    .first<{ account_id: string; project_id: string; episode_id: string | null; season_id: string | null }>()
  if (!row) return null
  return {
    accountId: row.account_id,
    projectId: row.project_id,
    seasonId: row.season_id ?? null,
    episodeId: row.episode_id ?? null,
    scriptId,
  }
}

/** Loads ordered elements and re-syncs one script's vectors. Never throws — indexing must not break writes. */
export async function resyncScriptSafely(env: Env, scriptId: string): Promise<void> {
  try {
    const scope = await resolveEmbedScope(env, scriptId)
    if (!scope) return

    const { results } = await env.DB.prepare(
      'SELECT type, content FROM script_elements WHERE script_id = ? ORDER BY position ASC'
    )
      .bind(scriptId)
      .all<{ type: string; content: string }>()

    await syncScriptEmbeddings(env, scope, results ?? [])
  } catch (error) {
    console.error(`Embedding sync failed for ${scriptId}; will correct on next sync`, error)
  }
}
