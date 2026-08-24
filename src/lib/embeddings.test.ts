import { describe, expect, it } from 'vitest'
import type { Env } from '../types'
import { chunkByScene, syncScriptEmbeddings, vectorId, deleteScriptEmbeddings } from './embeddings'

function makeEnv() {
  const upserts: Array<{ ids: string[]; metadata: Array<Record<string, unknown>> }> = []
  const deletes: string[][] = []
  const dbRows = new Map<string, number>()

  const env = {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async <T>() => {
            if (sql.includes('SELECT scene_count')) {
              const id = args[0] as string
              const count = dbRows.get(id)
              return (count === undefined ? null : { scene_count: count }) as T | null
            }
            return null
          },
          run: async () => {
            if (sql.includes('DELETE FROM vector_sync')) {
              dbRows.delete(args[0] as string)
            }
          },
        }),
      }),
      batch: async () => {},
    } as unknown as D1Database,
    VECTOR_INDEX: {
      upsert: async (vectors: Array<{ id: string; values: number[]; metadata: Record<string, unknown> }>) => {
        for (const v of vectors) {
          expect(v.id).toBeTruthy()
          expect(v.values?.length).toBeGreaterThan(0)
          upserts.push({ ids: [v.id], metadata: [v.metadata] })
        }
      },
      deleteByIds: async (ids: string[]) => {
        deletes.push(ids)
      },
      query: async () => ({ matches: [] }),
    } as unknown as VectorizeIndex,
    // Deterministic fake embeddings: first value encodes text length.
    AI_run: null,
  } as unknown as Env

  ;(env as unknown as { __upserts: typeof upserts }).__upserts = upserts
  ;(env as unknown as Record<string, unknown>).__deletes = deletes
  ;(env as unknown as Record<string, unknown>).__dbRows = dbRows

  // Stub AI.run with deterministic vectors.
  ;(env as unknown as { AI: Ai }).AI = {
    run: async (_model: string, input: { text: string[] }) => ({
      data: input.text.map((t) => [t.length, 0, 0]),
    }),
  } as unknown as Ai

  return env
}

const scope = { accountId: 'acct-1', projectId: 'proj-1', seasonId: 'seas-1', episodeId: 'ep-1', scriptId: 'sc-1' }

describe('chunkByScene', () => {
  it('groups elements under their preceding scene heading', () => {
    const chunks = chunkByScene([
      { type: 'scene_heading', content: 'INT. A - DAY' },
      { type: 'action', content: 'Wind blows.' },
      { type: 'dialogue', content: 'Go.' },
      { type: 'scene_heading', content: 'EXT. B - NIGHT' },
      { type: 'action', content: 'Rain falls.' },
    ])
    expect(chunks).toHaveLength(2)
    expect(chunks[0]?.text).toContain('INT. A - DAY')
    expect(chunks[0]?.text).toContain('Go.')
    expect(chunks[1]?.text).toContain('EXT. B - NIGHT')
    expect(chunks.map((c) => c.sceneIndex)).toEqual([0, 1])
  })

  it('keeps pre-heading content as its own preamble chunk', () => {
    const chunks = chunkByScene([{ type: 'action', content: 'FADE IN on a field.' }])
    expect(chunks).toEqual([{ sceneIndex: 0, text: 'FADE IN on a field.' }])
  })
})

describe('syncScriptEmbeddings (Tasks 4.8/4.12/4.13)', () => {
  it('upserts tenant-scoped metadata for every scene — Features and Episodes alike', async () => {
    const env = makeEnv()
    await syncScriptEmbeddings(env, { ...scope, episodeId: null, seasonId: null }, [
      { type: 'scene_heading', content: 'INT. FEATURE - DAY' },
      { type: 'action', content: 'A feature film scene, embedded the same way as TV.' },
    ])

    const state = env as unknown as { __upserts: Array<{ metadata: Array<Record<string, unknown>> }> }
    const meta = state.__upserts[0]!.metadata[0]!
    expect(meta).toMatchObject({
      accountId: 'acct-1',
      projectId: 'proj-1',
      seasonId: '',
      episodeId: '',
      scriptId: 'sc-1',
      sceneIndex: 0,
    })
  })

  it('deletes stale trailing vectors when a script shrinks', async () => {
    const env = makeEnv()
    const rows = (env as unknown as { __dbRows: Map<string, number> }).__dbRows

    rows.set('sc-1', 5) // previously synced with 5 scenes
    await syncScriptEmbeddings(env, scope, [
      { type: 'scene_heading', content: 'INT. SMALLER - DAY' },
      { type: 'action', content: 'Only one scene now.' },
    ])

    const deletes = (env as unknown as { __deletes: string[][] }).__deletes.flat()
    expect(deletes).toEqual([vectorId('sc-1', 1), vectorId('sc-1', 2), vectorId('sc-1', 3), vectorId('sc-1', 4)])
  })

  it('purges every vector when a script is deleted', async () => {
    const env = makeEnv()
    const rows = (env as unknown as { __dbRows: Map<string, number> }).__dbRows
    rows.set('sc-9', 3)

    await deleteScriptEmbeddings(env, 'sc-9')
    const deletes = (env as unknown as { __deletes: string[][] }).__deletes.flat()
    expect(deletes).toEqual([vectorId('sc-9', 0), vectorId('sc-9', 1), vectorId('sc-9', 2)])
    expect(rows.has('sc-9')).toBe(false)
  })
})
