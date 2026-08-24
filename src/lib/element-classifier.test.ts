import { afterEach, describe, expect, it, vi } from 'vitest'
import { classifyBufferedText } from './element-classifier'
import type { Env } from '../types'

const env = {
  DB: {} as D1Database,
  SESSIONS: {} as KVNamespace,
  PDFS: {} as R2Bucket,
  GROQ_API_KEY: 'test-key',
  GROQ_ZDR_CONFIRMED: 'true',
} as Env

const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()

afterEach(() => {
  fetchMock.mockReset()
})

function llmJsonResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
}

describe('classifyBufferedText (Task 3.4)', () => {
  it('classifies a whole buffer in ONE batched LLM call', async () => {
    fetchMock.mockResolvedValue(
      llmJsonResponse(
        JSON.stringify([
          { type: 'scene_heading', content: 'INT. BAR - NIGHT' },
          { type: 'action', content: 'The room goes quiet.' },
        ])
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await classifyBufferedText(env, 'int bar night. the room goes quiet.')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result).toEqual([
      { type: 'scene_heading', content: 'INT. BAR - NIGHT' },
      { type: 'action', content: 'The room goes quiet.' },
    ])
  })

  it('drops model responses with invalid element types rather than writing them', async () => {
    fetchMock.mockResolvedValue(
      llmJsonResponse(
        JSON.stringify([
          { type: 'prose', content: 'garbage' },
          { type: 'dialogue', content: 'Keep me.' },
          { nope: true },
        ])
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await classifyBufferedText(env, 'some dictation')
    expect(result).toEqual([{ type: 'dialogue', content: 'Keep me.' }])
  })

  it('falls back to action lines on LLM failure — dictated text is NEVER lost', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await classifyBufferedText(env, 'Mara slams the door.\nThe phone rings twice.')
    expect(result).toEqual([
      { type: 'action', content: 'Mara slams the door.' },
      { type: 'action', content: 'The phone rings twice.' },
    ])
  })

  it('falls back when the model returns prose instead of JSON', async () => {
    fetchMock.mockResolvedValue(llmJsonResponse('I cannot do that.'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await classifyBufferedText(env, 'single line of action')
    expect(result).toEqual([{ type: 'action', content: 'single line of action' }])
  })

  it('makes no network call at all when ZDR is unattested, preserving text via fallback', async () => {
    vi.stubGlobal('fetch', fetchMock)
    const unattested = { ...env, GROQ_ZDR_CONFIRMED: undefined } as Env

    // The launch guard in llm-router refuses the call; the classifier's
    // never-lose-text fallback keeps the dictation as local action lines
    // WITHOUT anything reaching Groq.
    const result = await classifyBufferedText(unattested, 'kept locally as action')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).toEqual([{ type: 'action', content: 'kept locally as action' }])
  })
})
