import { describe, expect, it, vi } from 'vitest'
import type { Env } from '../types'
import { retrievePassages } from './rag-retrieval'

const scope = { accountId: 'acct-1', projectId: 'proj-1' }

type QueryImpl = (vector: number[], opts?: Record<string, unknown>) => Promise<{ matches?: Array<{ id?: string; score?: number; metadata?: Record<string, unknown> }> }>

function makeEnv(indexImpl?: { query?: QueryImpl }) {
  const aiRun = vi.fn(async () => ({ data: [[0.1, 0.2]] }))
  const env = {
    DB: {} as D1Database,
    SESSIONS: {} as KVNamespace,
    PDFS: {} as R2Bucket,
    AI: { run: aiRun } as unknown as Ai,
    VECTOR_INDEX: {
      query: indexImpl?.query ?? (async () => ({ matches: [] })),
      upsert: async () => {},
      deleteByIds: async () => {},
    } as unknown as VectorizeIndex,
  } as Env
  return { env, aiRun }
}

describe('retrievePassages (Task 4.9)', () => {
  it('always filters by accountId AND projectId — the tenant-isolation invariant', async () => {
    const querySpy = vi.fn(async (_vector: number[], _opts?: Record<string, unknown>) => ({ matches: [] }))
    const { env } = makeEnv({ query: querySpy })

    await retrievePassages(env, scope, 'does the gun pay off?')

    expect(querySpy).toHaveBeenCalledOnce()
    const call = (querySpy.mock.calls as unknown as Array<[number, { filter?: Record<string, unknown>; topK?: number }]>)[0]
    const request = call?.[1]
    if (!request) throw new Error('query not called')
    expect(request.filter).toEqual({ accountId: 'acct-1', projectId: 'proj-1' })
    expect(request.topK ?? 8).toBeLessThanOrEqual(32)
  })

  it('maps matches to passages with episode provenance for Script Chips', async () => {
    const { env } = makeEnv({
      query: async () => ({
        matches: [
          { id: 'sc-9:2', score: 0.91, metadata: { scriptId: 'sc-9', episodeId: 'ep-2', sceneIndex: 2, text: 'The river confession.' } },
          { id: 'sc-1:0', score: 0.72, metadata: { scriptId: 'sc-1', episodeId: '', sceneIndex: 0, text: 'Current episode scene.' } },
        ],
      }),
    })

    const passages = await retrievePassages(env, scope, 'river confession')
    expect(passages).toHaveLength(2)
    expect(passages[0]).toMatchObject({ scriptId: 'sc-9', episodeId: 'ep-2', sceneIndex: 2 })
    // Empty-string episodeId normalizes to null (feature / current-episode).
    expect(passages[1]?.episodeId).toBeNull()
  })

  it('can exclude the currently open script so TV retrieval supplements other episodes', async () => {
    const { env } = makeEnv({
      query: async () => ({
        matches: [
          { metadata: { scriptId: 'sc-1', text: 'current script' } },
          { metadata: { scriptId: 'sc-5', episodeId: 'ep-3', text: 'other episode' } },
        ],
      }),
    })

    const passages = await retrievePassages(env, scope, 'query', { excludeScriptId: 'sc-1' })
    expect(passages.map((p) => p.scriptId)).toEqual(['sc-5'])
  })

  it('degrades silently to empty context when embedding fails', async () => {
    const { env } = makeEnv()
    ;(env.AI as unknown as { run: () => Promise<never> }).run = vi.fn(async () => {
      throw new Error('AI down')
    })
    const consoleWarn = vi.spyOn(console, 'error').mockImplementation(() => {})

    const passages = await retrievePassages(env, scope, 'query')
    expect(passages).toEqual([])
    consoleWarn.mockRestore()
  })

  it('degrades silently when the index query fails', async () => {
    const { env } = makeEnv({
      query: async () => {
        throw new Error('index down')
      },
    })
    const consoleWarn = vi.spyOn(console, 'error').mockImplementation(() => {})

    const passages = await retrievePassages(env, scope, 'query')
    expect(passages).toEqual([])
    consoleWarn.mockRestore()
  })
})
