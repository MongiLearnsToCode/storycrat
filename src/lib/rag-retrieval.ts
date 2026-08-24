import type { Env } from '../types'
import { embedTexts } from './embeddings'
import { safeVectorIndex } from './bindings'

/**
 * Retrieval-augmented grounding (Task 4.9; PRD Req 10, 42–43).
 *
 * Embeds the query and queries Vectorize filtered by accountId + projectId —
 * ALWAYS both. A match outside those scopes is a data leak, not a relevance
 * problem. For TV, retrieval supplements other episodes in the season; for
 * Features, it surfaces scenes from elsewhere in the same script. The
 * writer's current focus is always loaded directly and never relies on
 * retrieval alone.
 */

export interface RetrievedPassage {
  scriptId: string
  episodeId: string | null
  sceneIndex: number
  text: string
  score: number
}

export interface RetrievalScope {
  accountId: string
  projectId: string
}

interface VectorMetadata {
  scriptId?: string
  episodeId?: string
  sceneIndex?: number
  text?: string
}

/** Injectable query fn for tests; production hits the Vectorize binding. */
export async function retrievePassages(
  env: Env,
  scope: RetrievalScope,
  query: string,
  options: { topK?: number; excludeScriptId?: string } = {}
): Promise<RetrievedPassage[]> {
  const topK = Math.min(options.topK ?? 8, 32)

  let vector: number[]
  try {
    const vectors = await embedTexts(env, [query])
    const first = vectors[0]
    if (!first) throw new Error('empty embedding response')
    vector = first
  } catch (error) {
    console.error('Query embedding failed; proceeding without RAG context', error)
    return []
  }

  // Tenant filter is non-negotiable (security-doc.md § Authorization & Data Isolation).
  const filter: VectorizeVectorMetadataFilter = {
    accountId: scope.accountId,
    projectId: scope.projectId,
  }

  const index = safeVectorIndex(env)
  if (!index) return []

  let matches: Array<{ id?: string; score?: number; metadata?: VectorMetadata }>
  try {
    const result = await index.query(vector, { topK, filter, returnMetadata: 'all' })
    matches = result.matches ?? []
  } catch (error) {
    console.error('Vectorize query failed; proceeding without RAG context', error)
    return []
  }

  const passages: RetrievedPassage[] = []
  for (const match of matches) {
    const md = match.metadata
    if (!md?.scriptId || typeof md.text !== 'string') continue
    if (options.excludeScriptId && md.scriptId === options.excludeScriptId) continue

    passages.push({
      scriptId: md.scriptId,
      episodeId: md.episodeId || null,
      sceneIndex: md.sceneIndex ?? -1,
      text: md.text,
      score: match.score ?? 0,
    })
  }
  return passages
}
