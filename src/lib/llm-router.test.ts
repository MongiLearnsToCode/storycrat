import { afterEach, describe, expect, it, vi } from 'vitest'
import { LlmError, LlmRateLimitError, resolveModelConfig, runLlm, type ChatMessage } from './llm-router'
import type { Env } from '../index'

const env = {
  DB: {} as D1Database,
  SESSIONS: {} as KVNamespace,
  PDFS: {} as R2Bucket,
  GROQ_API_KEY: 'test-key',
  LLM_STRUCTURING_MODEL: 'struct-model-x',
  LLM_CRITIQUE_MODEL: 'critique-model-y',
} as Env

const messages: ChatMessage[] = [
  { role: 'system', content: 'system prompt' },
  { role: 'user', content: 'user content' },
]

function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
}

const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()

afterEach(() => {
  fetchMock.mockReset()
})

describe('resolveModelConfig', () => {
  it('maps each task type to its configured model', () => {
    expect(resolveModelConfig(env, 'structuring').model).toBe('struct-model-x')
    expect(resolveModelConfig(env, 'critique').model).toBe('critique-model-y')
  })

  it('falls back to defaults when overrides are unset', () => {
    const minimal = { ...env, LLM_STRUCTURING_MODEL: undefined, LLM_CRITIQUE_MODEL: undefined } as Env
    expect(resolveModelConfig(minimal, 'structuring').model).toBeTruthy()
    expect(resolveModelConfig(minimal, 'critique').model).toBeTruthy()
  })

  it('throws when no API key is configured', () => {
    const noKey = { ...env, GROQ_API_KEY: undefined } as Env
    expect(() => resolveModelConfig(noKey, 'structuring')).toThrow(LlmError)
  })
})

describe('runLlm', () => {
  it('sends the task-type model and auth header to the provider endpoint', async () => {
    fetchMock.mockResolvedValue(okResponse('done'))
    vi.stubGlobal('fetch', fetchMock)

    await runLlm(env, 'critique', messages)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    const body = JSON.parse(init.body as string) as { model: string; messages: ChatMessage[] }
    expect(body.model).toBe('critique-model-y')
    expect(body.messages).toEqual(messages)
  })

  it('returns the assistant content on success', async () => {
    fetchMock.mockResolvedValue(okResponse('the critique text'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(runLlm(env, 'structuring', messages)).resolves.toBe('the critique text')
  })

  it('maps HTTP 429 to LlmRateLimitError so UI can render the dedicated rate-limit state', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)

    const error = await runLlm(env, 'structuring', messages).catch((e) => e)
    expect(error).toBeInstanceOf(LlmRateLimitError)
    expect(error.status).toBe(429)
  })

  it('wraps other provider errors in LlmError with status preserved', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'bad model' } }), { status: 400 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const error = await runLlm(env, 'structuring', messages).catch((e) => e)
    expect(error).toBeInstanceOf(LlmError)
    expect(error.status).toBe(400)
    // Provider detail surfaces for logs but never becomes a generic crash.
    expect(error.message).toContain('bad model')
  })

  it('throws a typed timeout error when the request hangs past the deadline', async () => {
    fetchMock.mockImplementation(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const error = await runLlm(env, 'structuring', messages, { timeoutMs: 20 }).catch((e) => e)
    expect(error).toBeInstanceOf(LlmError)
    expect(error.message).toMatch(/timed out/)
  })

  it('throws when the completion has no content', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(runLlm(env, 'structuring', messages)).rejects.toThrow(/empty completion/)
  })

  it('respects caller cancellation', async () => {
    const controller = new AbortController()
    controller.abort()
    fetchMock.mockImplementation(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new Error('aborted'))
            return
          }
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const error = await runLlm(env, 'structuring', messages, { signal: controller.signal }).catch((e) => e)
    expect(error).toBeInstanceOf(LlmError)
    expect(error.message).toMatch(/cancelled/)
  })
})
