import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import type { Env } from '../types'
import { applyMigrations, authHeaders, seedUser } from '../test/helpers'
// Direct handler invocation: mocked Responses cannot cross request contexts
// (SELF.fetch would isolate them), so these tests call handlers with
// explicitly built contexts.
import { chat, getConversationHistory as historyHandler, getNotes } from './conversation'

const testEnv = env as unknown as Env

let userA: { userId: string; token: string }
let userB: { userId: string; token: string }
let projectId: string
let scriptId: string

const llmMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()

function mockLlmReply(reply: string) {
  llmMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), { status: 200 }))
}

async function callChat(token: string, body: Record<string, unknown>, overProjectId?: string) {
  const pid = overProjectId ?? projectId
  const request = new Request(`https://api.example/api/projects/${pid}/chat`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return chat({
    request,
    env: testEnv,
    params: { projectId: pid },
    url: new URL(request.url),
  })
}

beforeAll(async () => {
  await applyMigrations(testEnv)
  userA = await seedUser(testEnv, 'chat-a@test.dev')
  userB = await seedUser(testEnv, 'chat-b@test.dev')

  const response = await SELF.fetch('https://api.example/api/projects', {
    method: 'POST',
    headers: authHeaders(userA.token),
    body: JSON.stringify({ title: 'Chat Fixture', type: 'feature' }),
  })
  projectId = ((await response.json()) as { project: { id: string } }).project.id
  const scripts = await testEnv.DB.prepare('SELECT id FROM scripts WHERE project_id = ? AND episode_id IS NULL')
    .bind(projectId)
    .all<{ id: string }>()
  scriptId = scripts.results![0]!.id

  await testEnv.DB.batch([
    testEnv.DB.prepare("INSERT INTO script_elements (id, script_id, position, type, content) VALUES ('ce1', ?, 0, 'scene_heading', 'INT. PRECINCT - NIGHT')").bind(scriptId),
    testEnv.DB.prepare("INSERT INTO script_elements (id, script_id, position, type, content) VALUES ('ce2', ?, 1, 'dialogue', 'You always say that.')").bind(scriptId),
  ])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('conversation mode (Tasks 4.2–4.6)', () => {
  it('authenticates and enforces project ownership', async () => {
    const unauthed = await callChat('bogus-token', { question: 'hi' })
    expect(unauthed.status).toBe(401)

    const intruder = await callChat(userB.token, { question: 'hello?' })
    expect(intruder.status).toBe(404)
  })

  it('runs a full turn: persists both messages and returns citations-aware reply', async () => {
    mockLlmReply("The precinct scene leans on one voice. In INT. PRECINCT - NIGHT the line 'You always say that.' repeats her beat from earlier.")
    vi.stubGlobal('fetch', llmMock)

    const response = await callChat(userA.token, { question: 'Is my dialogue too repetitive in the opening?' })
    expect(response.status).toBe(201)
    const body = (await response.json()) as { conversationId: string; reply: { content: string } }
    expect(body.reply.content).toContain('INT. PRECINCT')
    expect(body.conversationId).toBeTruthy()

    // Both turns persisted for scroll-back.
    const historyResponse = await historyHandler({
      request: new Request('https://api.example/x', { headers: authHeaders(userA.token) }),
      env: testEnv,
      params: { projectId, conversationId: body.conversationId },
      url: new URL('https://api.example/x'),
    })
    expect(historyResponse.status).toBe(200)
    const historyBody = (await historyResponse.json()) as { messages: Array<{ role: string; content: string }> }
    expect(historyBody.messages.map((m) => m.role)).toEqual(['user', 'assistant'])

    // Scroll-back is owner-only.
    const intruder = await historyHandler({
      request: new Request('https://api.example/x', { headers: authHeaders(userB.token) }),
      env: testEnv,
      params: { projectId, conversationId: body.conversationId },
      url: new URL('https://api.example/x'),
    })
    expect(intruder.status).toBe(404)
  })

  it('assembled context includes the story bible when a season scope exists', async () => {
    const seriesResponse = await SELF.fetch('https://api.example/api/projects', {
      method: 'POST',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ title: 'Bible Series', type: 'series' }),
    })
    const seriesId = ((await seriesResponse.json()) as { project: { id: string } }).project.id
    const seasonResponse = await SELF.fetch(`https://api.example/api/projects/${seriesId}/seasons`, {
      method: 'POST',
      headers: authHeaders(userA.token),
      body: '{}',
    })
    const seasonId = ((await seasonResponse.json()) as { season: { id: string } }).season.id
    const episodeResponse = await SELF.fetch(`https://api.example/api/projects/${seriesId}/seasons/${seasonId}/episodes`, {
      method: 'POST',
      headers: authHeaders(userA.token),
      body: '{}',
    })
    const episode = ((await episodeResponse.json()) as { episode: { id: string; script_id: string } }).episode

    await testEnv.DB.prepare('INSERT INTO story_bibles (id, season_id, content) VALUES (?, ?, ?)')
      .bind(crypto.randomUUID(), seasonId, 'RULE: no phones after EP.1.')
      .run()

    let capturedSystemPrompt = ''
    llmMock.mockImplementation(async (_input, init) => {
      const parsed = JSON.parse(String(init?.body ?? '')) as { messages?: Array<{ role: string; content: string }> }
      capturedSystemPrompt = parsed.messages?.find((m) => m.role === 'system')?.content ?? ''
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Noted.' } }] }), { status: 200 })
    })
    vi.stubGlobal('fetch', llmMock)

    const response = await callChat(userA.token, { question: 'Any world rules I am breaking?', episodeId: episode.id }, seriesId)
    expect(response.status).toBe(201)

    expect(capturedSystemPrompt).toContain('<story_bible>')
    expect(capturedSystemPrompt).toContain('no phones after EP.1')
    expect(capturedSystemPrompt).toContain('<screenplay>')
  })

  it('rate-limits bursts per user with a distinct 429 message', { timeout: 30_000 }, async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }))
    )

    let sawLimit = false
    let lastStatus = 0
    for (let i = 0; i < 30; i++) {
      const response = await callChat(userA.token, { question: `burst ${i}` })
      lastStatus = response.status
      if (response.status === 429) {
        sawLimit = true
        const body = (await response.json()) as { error: string }
        expect(body.error).toMatch(/rate limit/i)
        break
      }
    }
    expect(sawLimit).toBe(true)
    void lastStatus
    const window = Math.floor(Date.now() / 60_000)
    const kvValue = await testEnv.SESSIONS.get(`ratelimit:${userA.userId}:${window}`)
    // eslint-disable-next-line no-console
    console.log('DEBUG burst done, sawLimit=', sawLimit, 'lastStatus=', lastStatus)

    // B's window is independent (B doesn't own the project → clean 404, not 429).
    const other = await callChat(userB.token, { question: 'mine' })
    expect(other.status).toBe(404)
  })

  it('rejects empty questions', async () => {
    const response = await callChat(userA.token, { question: '   ' })
    expect(response.status).toBe(400)
  })
})

describe('Get Notes (Task 4.11)', () => {
  it('returns a single static response persisted under a notes conversation', async () => {
    // Fresh user + project: the chat burst test exhausts A's rate window.
    const fresh = await seedUser(testEnv, `notes-${crypto.randomUUID()}@test.dev`)
    const projectResponse = await SELF.fetch('https://api.example/api/projects', {
      method: 'POST',
      headers: authHeaders(fresh.token),
      body: JSON.stringify({ title: 'Notes Fixture', type: 'feature' }),
    })
    expect(projectResponse.status).toBe(201)
    const projectBody = (await projectResponse.json()) as { project: { id: string } }
    const notesProjectId = projectBody.project.id
    const ownerRow = await testEnv.DB.prepare('SELECT owner_user_id FROM projects WHERE id = ?').bind(notesProjectId).first<{owner_user_id:string}>()
    console.log('DEBUG notes fixture owner:', JSON.stringify(ownerRow), 'fresh:', fresh.userId, 'token:', fresh.token)
    const scriptCheck = await testEnv.DB.prepare('SELECT id FROM scripts WHERE project_id = ? AND episode_id IS NULL').bind(notesProjectId).first<{ id: string }>()
    if (!scriptCheck) throw new Error('fixture: no feature script provisioned')
    const { findProject } = await import('../lib/ownership')
    const ownedRow = await findProject(testEnv, notesProjectId)
    if (!ownedRow) throw new Error(`fixture: project row missing (${notesProjectId})`)
    if (ownedRow.owner_user_id !== fresh.userId) throw new Error(`fixture: owner mismatch ${ownedRow.owner_user_id} vs ${fresh.userId}`)
    mockLlmReply('NOTES: 1) The precinct intro lacks escalation…')
    vi.stubGlobal('fetch', llmMock)

    const request = new Request(`https://api.example/api/projects/${notesProjectId}/notes`, {
      method: 'POST',
      headers: authHeaders(fresh.token),
      body: JSON.stringify({}),
    })
    const response = await getNotes({
      request,
      env: testEnv,
      params: { projectId: notesProjectId },
      url: new URL(request.url),
    })
    if (response.status !== 201) {
      const errBody = (await response.json()) as { error?: string }
      throw new Error(`getNotes ${response.status}: ${errBody.error}`)
    }
    const body = (await response.json()) as { notes: string }
    expect(body.notes).toMatch(/NOTES:/)
  })
})
