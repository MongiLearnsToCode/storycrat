import type { Env } from '../types'
import { safeAI, safeVectorIndex } from './bindings'

/**
 * Scene-chunked embedding pipeline (Tasks 4.8, 4.12, 4.13; PRD Req 44).
 *
 * Every script — Feature or Episode alike — is chunked by scene_heading and
 * embedded via Workers AI, upserted into Vectorize with tenant metadata on
 * every vector: accountId + projectId + seasonId + episodeId. Retrieval
 * without those filters is a cross-tenant data leak (security-doc.md).
 *
 * Vector IDs are deterministic (`${scriptId}:${sceneIndex}`) so re-syncs
 * overwrite in place; a D1 bookkeeping row tracks how many vectors exist so
 * shrinking scripts delete stale trailing scenes.
 */

export const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5'

export interface SceneChunk {
  sceneIndex: number
  text: string
}

interface ElementLike {
  type: string
  content: string
}

/** Groups ordered elements into scene chunks (preamble before first heading = scene 0). */
export function chunkByScene(elements: ElementLike[]): SceneChunk[] {
  const chunks: SceneChunk[] = []
  let current: string[] = []

  const flush = () => {
    const text = current.join('\n').trim()
    if (text) chunks.push({ sceneIndex: chunks.length, text })
    current = []
  }

  for (const element of elements) {
    if (element.type === 'scene_heading') {
      flush()
    }
    current.push(element.content)
  }
  flush()
  return chunks
}

export async function embedTexts(env: Env, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const ai = safeAI(env)
  if (!ai) throw new Error('Workers AI binding unavailable')
  const result = (await ai.run(EMBEDDING_MODEL, { text: texts })) as { data?: number[][] }
  const vectors = result?.data
  if (!Array.isArray(vectors) || vectors.length !== texts.length) {
    throw new Error('Workers AI returned unexpected embedding shape')
  }
  return vectors
}

export interface ScriptScope {
  accountId: string
  projectId: string
  /** Series only; '' for features keeps the metadata index happy (string type). */
  seasonId?: string | null
  episodeId?: string | null
  scriptId: string
}

/**
 * Re-syncs one script's scene vectors: upserts current scenes, deletes stale
 * trailing ones from previous syncs. Idempotent.
 */
export async function syncScriptEmbeddings(env: Env, scope: ScriptScope, elements: ElementLike[]): Promise<number> {
  const index = safeVectorIndex(env)
  if (!index) return 0 // Remote binding unavailable (tests/local dev): skip silently.

  const chunks = chunkByScene(elements)

  // Bookkeeping row tells us which trailing ids to purge.
  const previous = await env.DB.prepare('SELECT scene_count FROM vector_sync WHERE script_id = ?')
    .bind(scope.scriptId)
    .first<{ scene_count: number }>()
  const previousCount = previous?.scene_count ?? 0

  const staleIds: string[] = []
  for (let i = chunks.length; i < previousCount; i++) {
    staleIds.push(vectorId(scope.scriptId, i))
  }
  if (staleIds.length > 0) {
    await index.deleteByIds(staleIds)
  }

  if (chunks.length > 0) {
    const vectors = await embedTexts(env, chunks.map((c) => c.text))
    await index.upsert(
      chunks.map((c, i) => ({
        id: vectorId(scope.scriptId, c.sceneIndex),
        values: vectors[i] ?? [],
        metadata: {
          accountId: scope.accountId,
          projectId: scope.projectId,
          seasonId: scope.seasonId ?? '',
          episodeId: scope.episodeId ?? '',
          scriptId: scope.scriptId,
          sceneIndex: c.sceneIndex,
          // Stored so retrieval can return the passage itself.
          text: c.text.slice(0, 4000),
        },
      }))
    )
  }

  await env.DB.prepare(
    `INSERT INTO vector_sync (script_id, scene_count) VALUES (?, ?)
     ON CONFLICT(script_id) DO UPDATE SET scene_count = excluded.scene_count, synced_at = datetime('now')`
  )
    .bind(scope.scriptId, chunks.length)
    .run()

  return chunks.length
}

/** Removes every vector belonging to a deleted script. */
export async function deleteScriptEmbeddings(env: Env, scriptId: string): Promise<void> {
  const index = safeVectorIndex(env)
  if (!index) return

  const previous = await env.DB.prepare('SELECT scene_count FROM vector_sync WHERE script_id = ?')
    .bind(scriptId)
    .first<{ scene_count: number }>()
  const count = previous?.scene_count ?? 0

  if (count > 0) {
    await index.deleteByIds(Array.from({ length: count }, (_, i) => vectorId(scriptId, i)))
  }
  await env.DB.prepare('DELETE FROM vector_sync WHERE script_id = ?').bind(scriptId).run()
}

export function vectorId(scriptId: string, sceneIndex: number): string {
  return `${scriptId}:${sceneIndex}`
}
