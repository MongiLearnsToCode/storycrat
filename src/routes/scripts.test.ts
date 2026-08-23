import { beforeAll, describe, expect, it } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import type { Env } from '../types'
import { applyMigrations, authHeaders, seedUser, type TestUser } from '../test/helpers'

const testEnv = env as unknown as Env

let userA: TestUser
let userB: TestUser
let scriptId: string

beforeAll(async () => {
  await applyMigrations(testEnv)
  userA = await seedUser(testEnv, 'script-a@test.dev')
  userB = await seedUser(testEnv, 'script-b@test.dev')

  const response = await SELF.fetch('https://api.example/api/projects', {
    method: 'POST',
    headers: authHeaders(userA.token),
    body: JSON.stringify({ title: 'Element Tests', type: 'feature' }),
  })
  const projectId = ((await response.json()) as { project: { id: string } }).project.id
  const scripts = await testEnv.DB.prepare('SELECT id FROM scripts WHERE project_id = ? AND episode_id IS NULL')
    .bind(projectId)
    .all<{ id: string }>()
  scriptId = scripts.results![0]!.id
})

const url = (suffix = '') => `https://api.example/api/scripts/${scriptId}${suffix}`

describe('pdf export', () => {
  it('streams an owned script as a PDF', async () => {
    // Seed a couple of elements first.
    await SELF.fetch(url('/elements'), {
      method: 'PUT',
      headers: authHeaders(userA.token),
      body: JSON.stringify({
        elements: [
          { type: 'scene_heading', content: 'INT. TEST - DAY' },
          { type: 'action', content: 'The export path runs end to end.' },
        ],
      }),
    })

    const response = await SELF.fetch(url('/pdf'), { headers: authHeaders(userA.token) })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('attachment')

    const bytes = new Uint8Array(await response.arrayBuffer())
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(1000)
  })

  it('requires ownership and authentication for exports', async () => {
    expect((await SELF.fetch(url('/pdf'))).status).toBe(401)
    expect((await SELF.fetch(url('/pdf'), { headers: authHeaders(userB.token) })).status).toBe(404)
  })
})

describe('script element replacement', () => {
  it('starts empty', async () => {
    // The PDF tests above seed content; reset to a clean slate.
    await SELF.fetch(url('/elements'), {
      method: 'PUT',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ elements: [] }),
    })
    const response = await SELF.fetch(url(), { headers: authHeaders(userA.token) })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { elements: unknown[] }
    expect(body.elements).toEqual([])
  })

  it('requires authentication and ownership', async () => {
    expect((await SELF.fetch(url(), { headers: authHeaders('bad') })).status).toBe(401)
    // User B must not read or write user A's script — 404, no existence leak.
    expect((await SELF.fetch(url(), { headers: authHeaders(userB.token) })).status).toBe(404)
    expect(
      (
        await SELF.fetch(url('/elements'), {
          method: 'PUT',
          headers: authHeaders(userB.token),
          body: JSON.stringify({ elements: [] }),
        })
      ).status
    ).toBe(404)
  })

  it('replaces elements with normalized positions in order', async () => {
    const elements = [
      { type: 'scene_heading', content: 'INT. DISPATCH - NIGHT' },
      { type: 'action', content: 'Rain hammers the windows.' },
      { type: 'character', content: 'MARA' },
      { type: 'parenthetical', content: '(into radio)' },
      { type: 'dialogue', content: "Unit two, we're moving." },
      { type: 'transition', content: 'CUT TO:' },
    ]
    const response = await SELF.fetch(url('/elements'), {
      method: 'PUT',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ elements }),
    })
    expect(response.status).toBe(200)

    const body = (await response.json()) as { elements: Array<{ position: number; type: string; content: string }> }
    expect(body.elements.map((e) => e.position)).toEqual([0, 1, 2, 3, 4, 5])
    expect(body.elements[2]).toMatchObject({ type: 'character', content: 'MARA' })
  })

  it('rejects invalid element payloads wholesale', async () => {
    for (const elements of [
      'not-an-array',
      [{ type: 'prose', content: 'nope' }],
      [{ type: 'action', content: 42 }],
      [{ type: 'action' }],
    ]) {
      const response = await SELF.fetch(url('/elements'), {
        method: 'PUT',
        headers: authHeaders(userA.token),
        body: JSON.stringify({ elements }),
      })
      expect(response.status).toBe(400)
    }

    // The failed writes above must not have touched the stored elements.
    const check = await SELF.fetch(url(), { headers: authHeaders(userA.token) })
    const body = (await check.json()) as { elements: unknown[] }
    expect(body.elements.length).toBe(6)
  })

  it('accepts an empty array to clear the script', async () => {
    const response = await SELF.fetch(url('/elements'), {
      method: 'PUT',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ elements: [] }),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { elements: unknown[] }
    expect(body.elements).toEqual([])
  })
})

describe('single-element updates (re-tag / correction)', () => {
  let characterElementId: string

  beforeAll(async () => {
    const putResponse = await SELF.fetch(url('/elements'), {
      method: 'PUT',
      headers: authHeaders(userA.token),
      body: JSON.stringify({
        elements: [
          { type: 'action', content: 'Mara checks her six.' },
          { type: 'action', content: 'MARA' }, // misclassified on purpose
          { type: 'dialogue', content: 'Clear left.' },
        ],
      }),
    })
    expect(putResponse.status).toBe(200)
    const body = (await (await SELF.fetch(url(), { headers: authHeaders(userA.token) })).json()) as {
      elements: Array<{ id: string; type: string; content: string }>
    }
    expect(body.elements).toHaveLength(3)
    const target = body.elements.find((e) => e.content === 'MARA')
    if (!target) throw new Error(`MARA element not found in: ${JSON.stringify(body.elements)}`)
    characterElementId = target.id
  })

  it('re-tags a misclassified element type', async () => {
    const response = await SELF.fetch(url(`/elements/${characterElementId}`), {
      method: 'PATCH',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ type: 'character' }),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { element: { type: string; content: string } }
    expect(body.element.type).toBe('character')
    expect(body.element.content).toBe('MARA')
  })

  it('updates content without touching type', async () => {
    const response = await SELF.fetch(url(`/elements/${characterElementId}`), {
      method: 'PATCH',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ content: 'MARA (O.S.)' }),
    })
    const body = (await response.json()) as { element: { type: string; content: string } }
    expect(response.status).toBe(200)
    expect(body.element).toMatchObject({ type: 'character', content: 'MARA (O.S.)' })
  })

  it('rejects invalid update payloads', async () => {
    expect(
      (
        await SELF.fetch(url(`/elements/${characterElementId}`), {
          method: 'PATCH',
          headers: authHeaders(userA.token),
          body: JSON.stringify({}),
        })
      ).status
    ).toBe(400)
    expect(
      (
        await SELF.fetch(url(`/elements/${characterElementId}`), {
          method: 'PATCH',
          headers: authHeaders(userA.token),
          body: JSON.stringify({ type: 'stage_direction' }),
        })
      ).status
    ).toBe(400)
  })

  it("returns 404 for another user's elements", async () => {
    const response = await SELF.fetch(url(`/elements/${characterElementId}`), {
      method: 'PATCH',
      headers: authHeaders(userB.token),
      body: JSON.stringify({ content: 'hijack' }),
    })
    expect(response.status).toBe(404)

    // And the content is untouched.
    const check = (await (await SELF.fetch(url(), { headers: authHeaders(userA.token) })).json()) as {
      elements: Array<{ content: string }>
    }
    expect(check.elements.find((e) => e.content === 'MARA (O.S.)')).toBeTruthy()
  })
})
