import { beforeAll, describe, expect, it } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import type { Env } from '../types'
import { applyMigrations, authHeaders, seedUser } from '../test/helpers'

const testEnv = env as unknown as Env

let userA: { userId: string; token: string }
let userB: { userId: string; token: string }

beforeAll(async () => {
  await applyMigrations(testEnv)
  userA = await seedUser(testEnv, 'tier-a@test.dev')
  userB = await seedUser(testEnv, 'tier-b@test.dev')
})

function createProject(token: string, title: string, type: 'feature' | 'series') {
  return SELF.fetch('https://api.example/api/projects', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title, type }),
  })
}

function createEpisode(token: string, seriesId: string, seasonId: string, title: string) {
  return SELF.fetch(`https://api.example/api/projects/${seriesId}/seasons/${seasonId}/episodes`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  })
}

describe('free-tier gating (Tasks 5.2–5.3)', () => {
  it('counts lifetime scripts and never lets them decrease', async () => {
    // A creates their one free feature project.
    const first = await createProject(userA.token, 'First Feature', 'feature')
    expect(first.status).toBe(201)

    const count1 = await testEnv.DB.prepare('SELECT lifetime_script_count FROM users WHERE id = ?')
      .bind(userA.userId)
      .first<{ lifetime_script_count: number }>()
    expect(count1?.lifetime_script_count).toBe(1)

    // Deleting the project must NOT restore the allowance (PRD Req 34).
    await SELF.fetch(`https://api.example/api/projects/${((await first.json()) as { project: { id: string } }).project.id}`, {
      method: 'DELETE',
      headers: authHeaders(userA.token),
    })
    const count2 = await testEnv.DB.prepare('SELECT lifetime_script_count FROM users WHERE id = ?')
      .bind(userA.userId)
      .first<{ lifetime_script_count: number }>()
    expect(count2?.lifetime_script_count).toBe(1)
  })

  it('blocks the second feature project with a 402 + upgrade messaging', async () => {
    const second = await createProject(userA.token, 'Second Feature', 'feature')
    expect(second.status).toBe(402)
    const body = (await second.json()) as { code: string }
    expect(body.code).toBe('free_tier_limit')
  })

  it('caps series at exactly ONE episode — disclosed at creation, not discovered later', async () => {
    // B creates a series (series creation itself doesn't provision a script).
    const series = await createProject(userB.token, 'B Series', 'series')
    expect(series.status).toBe(201)
    const seriesId = ((await series.json()) as { project: { id: string } }).project.id

    const season = await SELF.fetch(`https://api.example/api/projects/${seriesId}/seasons`, {
      method: 'POST',
      headers: authHeaders(userB.token),
      body: '{}',
    })
    const seasonId = ((await season.json()) as { season: { id: string } }).season.id

    const ep1 = await createEpisode(userB.token, seriesId, seasonId, 'Pilot')
    expect(ep1.status).toBe(201)

    const ep2 = await createEpisode(userB.token, seriesId, seasonId, 'Episode Two')
    expect(ep2.status).toBe(402)
    const body = (await ep2.json()) as { error: string }
    expect(body.error).toMatch(/one script \(or one TV episode\)/i)
  })

  it('an active subscription bypasses the cap', async () => {
    await testEnv.DB.prepare(
      "INSERT INTO subscriptions (user_id, polar_subscription_id, status, plan) VALUES (?, ?, 'active', 'Storycrat Pro')"
    )
      .bind(userA.userId, `sub-${crypto.randomUUID()}`)
      .run()

    const third = await createProject(userA.token, 'Subscriber Feature', 'feature')
    expect(third.status).toBe(201)

    // Status endpoint reflects the subscription.
    const status = await SELF.fetch('https://api.example/api/billing/subscription', {
      headers: authHeaders(userA.token),
    })
    const body = (await status.json()) as { subscribed: boolean; plan: string | null }
    expect(body.subscribed).toBe(true)
    expect(body.plan).toBe('Storycrat Pro')
  })

  it('billing status requires authentication', async () => {
    expect((await SELF.fetch('https://api.example/api/billing/subscription')).status).toBe(401)
  })
})

describe('Polar webhook (Task 5.4)', () => {
  const secret = 'test-webhook-secret'

  async function signedWebhook(payload: unknown, overrideSig?: string): Promise<Response> {
    const raw = JSON.stringify(payload)
    const id = crypto.randomUUID()
    const timestamp = String(Math.floor(Date.now() / 1000))
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${raw}`))
    const sig = btoa(String.fromCharCode(...new Uint8Array(mac)))
    return SELF.fetch('https://api.example/api/billing/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': overrideSig ?? `v1,${sig}`,
      },
      body: raw,
    })
  }

  it('rejects webhooks with bad signatures', async () => {
    const response = await signedWebhook({ type: 'subscription.created', data: {} }, 'v1,badsig')
    expect(response.status).toBe(403)
  })

  it('rejects stale timestamps (replay window)', async () => {
    const raw = JSON.stringify({ type: 'subscription.created', data: {} })
    const id = crypto.randomUUID()
    const stale = String(Math.floor(Date.now() / 1000) - 3600)
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${stale}.${raw}`))
    const sig = btoa(String.fromCharCode(...new Uint8Array(mac)))

    const response = await SELF.fetch('https://api.example/api/billing/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': id,
        'svix-timestamp': stale,
        'svix-signature': `v1,${sig}`,
      },
      body: raw,
    })
    expect(response.status).toBe(403)
  })

  it('grants access on subscription.created and revokes on canceled — via metadata userId', async () => {
    const user = await seedUser(testEnv, `polar-${crypto.randomUUID()}@test.dev`)
    const subId = `sub-${crypto.randomUUID()}`

    const created = await signedWebhook({
      type: 'subscription.created',
      data: {
        id: subId,
        status: 'active',
        metadata: { userId: user.userId },
        product: { name: 'Storycrat Pro' },
      },
    })
    expect(created.status).toBe(200)

    const status = await SELF.fetch('https://api.example/api/billing/subscription', {
      headers: authHeaders(user.token),
    })
    const body = (await status.json()) as { subscribed: boolean }
    expect(body.subscribed).toBe(true)

    const canceled = await signedWebhook({
      type: 'subscription.canceled',
      data: { id: subId, status: 'canceled', metadata: { userId: user.userId } },
    })
    expect(canceled.status).toBe(200)

    const after = await SELF.fetch('https://api.example/api/billing/subscription', {
      headers: authHeaders(user.token),
    })
    const afterBody = (await after.json()) as { subscribed: boolean }
    expect(afterBody.subscribed).toBe(false)
  })
})
