import { describe, expect, it } from 'vitest'
import { compilePath, createRouter, errorResponse, jsonResponse, type Env } from './index'

// Routing tests never touch bindings; a cast keeps them independent of
// which resources have been provisioned so far.
const env = {} as Env

describe('health endpoint', () => {
  it.each(['/health', '/api/health'])('returns 200 with ok status at %s', async (path) => {
    const router = createRouter()
    const request = new Request(`https://storycrat.example${path}`)
    const response = await router.handle(request, env)

    expect(response.status).toBe(200)
    const body = (await response.json()) as { status: string; service: string }
    expect(body.status).toBe('ok')
    expect(body.service).toBe('storycrat')
  })
})

describe('router', () => {
  it('returns 404 for unmatched routes', async () => {
    const router = createRouter()
    const response = await router.handle(new Request('https://storycrat.example/nope'), env)

    expect(response.status).toBe(404)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('Not found')
  })

  it('matches path params and decodes them', async () => {
    const router = createRouter()
    let captured: Record<string, string> | undefined
    router.get('/projects/:projectId/episodes/:episodeId', ({ params }) => {
      captured = params
      return jsonResponse({ ok: true })
    })

    const response = await router.handle(
      new Request('https://storycrat.example/projects/p%201/episodes/e2'),
      env
    )

    expect(response.status).toBe(200)
    expect(captured).toEqual({ projectId: 'p 1', episodeId: 'e2' })
  })

  it('rejects wrong-method requests', async () => {
    const router = createRouter()
    router.post('/things', () => jsonResponse({ ok: true }))

    const response = await router.handle(new Request('https://storycrat.example/things'), env)
    expect(response.status).toBe(404)
  })

  it('converts handler throws into a 500 without leaking the message', async () => {
    const router = createRouter()
    router.get('/boom', () => {
      throw new Error('secret detail')
    })

    const response = await router.handle(new Request('https://storycrat.example/boom'), env)
    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('Internal server error')
    expect(body.error).not.toContain('secret')
  })

  it('supports trailing-slash tolerance', async () => {
    const router = createRouter()
    router.get('/health/', () => jsonResponse({ ok: true }))
    const response = await router.handle(new Request('https://storycrat.example/health/'), env)
    expect(response.status).toBe(200)
  })
})

describe('compilePath', () => {
  it('escapes regex metacharacters in literal segments', () => {
    const { regex, paramNames } = compilePath('/a.b(c)/:id')
    expect(paramNames).toEqual(['id'])
    expect(regex.test('/a.b(c)/42')).toBe(true)
    expect(regex.test('/aXbXc/42')).toBe(false)
  })
})

describe('response helpers', () => {
  it('jsonResponse sets JSON content type', () => {
    const response = jsonResponse({ a: 1 }, 201)
    expect(response.status).toBe(201)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('errorResponse wraps the message', async () => {
    const response = errorResponse('Bad input', 400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('Bad input')
  })
})
