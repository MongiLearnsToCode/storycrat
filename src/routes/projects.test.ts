import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import type { Env } from '../types'
import { applyMigrations, authHeaders, seedUser, type TestUser } from '../test/helpers'

const testEnv = env as unknown as Env

let userA: TestUser
let userB: TestUser
let featureId: string
let seriesId: string
let seasonId: string
let episodeId: string
let episodeScriptId: string

beforeAll(async () => {
  await applyMigrations(testEnv)
  userA = await seedUser(testEnv, 'a@test.dev')
  userB = await seedUser(testEnv, 'b@test.dev')
})

afterAll(async () => {
  // Isolated per-file storage; nothing to clean between files.
})

describe('authentication', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const response = await SELF.fetch('https://api.example/api/projects')
    expect(response.status).toBe(401)
  })

  it('rejects invalid session tokens with 401', async () => {
    const response = await SELF.fetch('https://api.example/api/projects', {
      headers: authHeaders('bogus-token'),
    })
    expect(response.status).toBe(401)
  })
})

describe('project CRUD', () => {
  it('creates a feature project and provisions its script', async () => {
    const response = await SELF.fetch('https://api.example/api/projects', {
      method: 'POST',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ title: 'The Long Night', type: 'feature' }),
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as { project: { id: string; title: string; type: string } }
    featureId = body.project.id
    expect(body.project.type).toBe('feature')

    const scripts = await testEnv.DB.prepare('SELECT id FROM scripts WHERE project_id = ? AND episode_id IS NULL')
      .bind(featureId)
      .all<{ id: string }>()
    expect(scripts.results?.length).toBe(1)
  })

  it('resolves an owned feature project to its screenplay', async () => {
    const response = await SELF.fetch(`https://api.example/api/projects/${featureId}/feature-script`, {
      headers: authHeaders(userA.token),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { scriptId: string }
    const script = await testEnv.DB.prepare('SELECT project_id FROM scripts WHERE id = ?')
      .bind(body.scriptId)
      .first<{ project_id: string }>()
    expect(script?.project_id).toBe(featureId)
  })

  it("does not expose another user's feature screenplay", async () => {
    const response = await SELF.fetch(`https://api.example/api/projects/${featureId}/feature-script`, {
      headers: authHeaders(userB.token),
    })
    expect(response.status).toBe(404)
  })

  it('rejects invalid project payloads', async () => {
    for (const body of [{ title: '', type: 'feature' }, { title: 'X', type: 'trilogy' }, { type: 'feature' }]) {
      const response = await SELF.fetch('https://api.example/api/projects', {
        method: 'POST',
        headers: authHeaders(userA.token),
        body: JSON.stringify(body),
      })
      expect(response.status).toBe(400)
    }
  })

  it('lists only the owner’s projects', async () => {
    const mine = await SELF.fetch('https://api.example/api/projects', { headers: authHeaders(userA.token) })
    const theirs = await SELF.fetch('https://api.example/api/projects', { headers: authHeaders(userB.token) })
    const mineBody = (await mine.json()) as { projects: unknown[] }
    const theirsBody = (await theirs.json()) as { projects: unknown[] }
    expect(mineBody.projects.length).toBe(1)
    expect(theirsBody.projects.length).toBe(0)
  })

  it("hides another user's project behind 404 (no existence leak)", async () => {
    const response = await SELF.fetch(`https://api.example/api/projects/${featureId}`, {
      headers: authHeaders(userB.token),
    })
    expect(response.status).toBe(404)
  })

  it('updates the title of an owned project', async () => {
    const response = await SELF.fetch(`https://api.example/api/projects/${featureId}`, {
      method: 'PATCH',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ title: 'The Long Night: Draft 2' }),
    })
    expect(response.status).toBe(200)
    const check = await testEnv.DB.prepare('SELECT title FROM projects WHERE id = ?').bind(featureId).first<{ title: string }>()
    expect(check?.title).toBe('The Long Night: Draft 2')
  })

  it('deletes only an owned project and cascades its screenplay data', async () => {
    const createResponse = await SELF.fetch('https://api.example/api/projects', {
      method: 'POST',
      headers: authHeaders(userB.token),
      body: JSON.stringify({ title: 'Disposable Draft', type: 'feature' }),
    })
    const projectId = ((await createResponse.json()) as { project: { id: string } }).project.id
    const script = await testEnv.DB.prepare('SELECT id FROM scripts WHERE project_id = ?')
      .bind(projectId)
      .first<{ id: string }>()
    expect(script?.id).toBeTruthy()

    const denied = await SELF.fetch(`https://api.example/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: authHeaders(userA.token),
    })
    expect(denied.status).toBe(404)

    const deleted = await SELF.fetch(`https://api.example/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: authHeaders(userB.token),
    })
    expect(deleted.status).toBe(200)
    expect(await testEnv.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first()).toBeNull()
    expect(await testEnv.DB.prepare('SELECT id FROM scripts WHERE project_id = ?').bind(projectId).first()).toBeNull()
  })
})

describe('series structure', () => {
  it('refuses seasons on feature projects', async () => {
    const response = await SELF.fetch(`https://api.example/api/projects/${featureId}/seasons`, {
      method: 'POST',
      headers: authHeaders(userA.token),
      body: JSON.stringify({}),
    })
    expect(response.status).toBe(400)
  })

  it('creates a series project, season, and episode with auto-provisioned script', async () => {
    // This fixture tests structure, not the tier cap — grant a subscription
    // so userA's earlier feature project doesn't trip the free-tier gate.
    await testEnv.DB.prepare(
      "INSERT INTO subscriptions (user_id, polar_subscription_id, status, plan) VALUES (?, ?, 'active', 'Fixture Pro')"
    )
      .bind(userA.userId, `sub-${crypto.randomUUID()}`)
      .run()

    const seriesResponse = await SELF.fetch('https://api.example/api/projects', {
      method: 'POST',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ title: 'Nightshift', type: 'series' }),
    })
    seriesId = ((await seriesResponse.json()) as { project: { id: string } }).project.id

    // Series projects get no direct script.
    const directScripts = await testEnv.DB.prepare('SELECT COUNT(*) AS n FROM scripts WHERE project_id = ? AND episode_id IS NULL')
      .bind(seriesId)
      .first<{ n: number }>()
    expect(directScripts?.n).toBe(0)

    const seasonResponse = await SELF.fetch(`https://api.example/api/projects/${seriesId}/seasons`, {
      method: 'POST',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ title: 'Season One' }),
    })
    seasonId = ((await seasonResponse.json()) as { season: { id: string; season_number: number } }).season.id
    expect(seasonId).toBeTruthy()

    const episodeResponse = await SELF.fetch(`https://api.example/api/projects/${seriesId}/seasons/${seasonId}/episodes`, {
      method: 'POST',
      headers: authHeaders(userA.token),
      body: JSON.stringify({ title: 'Cold Open' }),
    })
    expect(episodeResponse.status).toBe(201)
    const episodeBody = (await episodeResponse.json()) as { episode: { id: string; script_id: string; episode_number: number } }
    episodeId = episodeBody.episode.id
    episodeScriptId = episodeBody.episode.script_id
    expect(episodeScriptId).toBeTruthy()
    expect(episodeBody.episode.episode_number).toBe(1)

    // The episode's script must exist and belong to this project.
    const scriptRow = await testEnv.DB.prepare('SELECT project_id FROM scripts WHERE id = ?')
      .bind(episodeScriptId)
      .first<{ project_id: string }>()
    expect(scriptRow?.project_id).toBe(seriesId)
  })

  it("hides another user's seasons and episodes behind 404", async () => {
    const seasonResponse = await SELF.fetch(`https://api.example/api/projects/${seriesId}/seasons`, {
      headers: authHeaders(userB.token),
    })
    expect(seasonResponse.status).toBe(404)

    const episodeResponse = await SELF.fetch(
      `https://api.example/api/projects/${seriesId}/seasons/${seasonId}/episodes`,
      { headers: authHeaders(userB.token) }
    )
    expect(episodeResponse.status).toBe(404)
  })
})

describe('story bible', () => {
  it('materializes an empty bible on first read', async () => {
    const response = await SELF.fetch(
      `https://api.example/api/projects/${seriesId}/seasons/${seasonId}/story-bible`,
      { headers: authHeaders(userA.token) }
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { storyBible: { content: string; season_id: string } }
    expect(body.storyBible.content).toBe('')
    expect(body.storyBible.season_id).toBe(seasonId)
  })

  it('saves and returns updated content', async () => {
    const putResponse = await SELF.fetch(
      `https://api.example/api/projects/${seriesId}/seasons/${seasonId}/story-bible`,
      {
        method: 'PUT',
        headers: authHeaders(userA.token),
        body: JSON.stringify({ content: "Mara never explains the scar. It pays off in EP.6." }),
      }
    )
    expect(putResponse.status).toBe(200)
    const body = (await putResponse.json()) as { storyBible: { content: string } }
    expect(body.storyBible.content).toContain('EP.6')

    // Upsert, not duplicate: still exactly one row for the season.
    const rows = await testEnv.DB.prepare('SELECT COUNT(*) AS n FROM story_bibles WHERE season_id = ?')
      .bind(seasonId)
      .first<{ n: number }>()
    expect(rows?.n).toBe(1)
  })

  it('rejects non-string and oversized content', async () => {
    expect(
      (
        await SELF.fetch(`https://api.example/api/projects/${seriesId}/seasons/${seasonId}/story-bible`, {
          method: 'PUT',
          headers: authHeaders(userA.token),
          body: JSON.stringify({ content: 42 }),
        })
      ).status
    ).toBe(400)

    expect(
      (
        await SELF.fetch(`https://api.example/api/projects/${seriesId}/seasons/${seasonId}/story-bible`, {
          method: 'PUT',
          headers: authHeaders(userA.token),
          body: JSON.stringify({ content: 'x'.repeat(200_001) }),
        })
      ).status
    ).toBe(400)
  })

  it("hides another user's story bible behind 404", async () => {
    const response = await SELF.fetch(
      `https://api.example/api/projects/${seriesId}/seasons/${seasonId}/story-bible`,
      { headers: authHeaders(userB.token) }
    )
    expect(response.status).toBe(404)
  })
})
