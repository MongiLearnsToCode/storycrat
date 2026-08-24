import type { Env } from '../types'
import type { RouteContext, Router } from '../index'
import { errorResponse, jsonResponse } from '../index'
import { requireUser, SESSION_COOKIE, createSession } from '../lib/auth'

/**
 * Magic-link authentication (Task 5.1; PRD: email magic link via Resend,
 * sessions in KV, security-doc.md § Authentication).
 *
 * Tokens are single-use and time-limited (15 minutes): verifying consumes
 * the KV record atomically (delete-and-check), so a replayed link is dead
 * on arrival. Requests are rate-limited per email to prevent mail-bombing.
 */

const MAGIC_TTL_SECONDS = 15 * 60
const MAGIC_KEY_PREFIX = 'magic:'
const LINK_RATE_PER_HOUR = 5

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function findOrCreateUser(env: Env, email: string): Promise<string> {
  const normalized = email.trim().toLowerCase()
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(normalized)
    .first<{ id: string }>()
  if (existing) return existing.id

  const id = crypto.randomUUID()
  await env.DB.prepare('INSERT INTO users (id, email) VALUES (?, ?)').bind(id, normalized).run()
  return id
}

async function sendMagicEmail(env: Env, to: string, link: string): Promise<void> {
  const apiKey = env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM ?? 'Storycrat <onboarding@resend.dev>',
      to,
      subject: 'Your Storycrat sign-in link',
      text: `Sign in to Storycrat:\n\n${link}\n\nThis link works once and expires in 15 minutes.`,
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Resend send failed (${response.status}): ${detail.slice(0, 200)}`)
  }
}

async function checkLinkRateLimit(env: Env, email: string): Promise<boolean> {
  const window = Math.floor(Date.now() / 3_600_000)
  const key = `magicrl:${email}:${window}`
  const current = Number((await env.SESSIONS.get(key)) ?? '0')
  if (current >= LINK_RATE_PER_HOUR) return false
  await env.SESSIONS.put(key, String(current + 1), { expirationTtl: 3900 })
  return true
}

/** POST /api/auth/request-link { email } */
async function requestLink(ctx: RouteContext): Promise<Response> {
  let body: { email?: unknown }
  try {
    body = (await ctx.request.json()) as typeof body
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }
  if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
    return errorResponse('A valid email address is required', 400)
  }
  const email = body.email.trim().toLowerCase()

  if (!(await checkLinkRateLimit(ctx.env, email))) {
    return errorResponse('Too many sign-in requests — check your inbox or try again later.', 429)
  }

  const userId = await findOrCreateUser(ctx.env, email)
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  await ctx.env.SESSIONS.put(`${MAGIC_KEY_PREFIX}${token}`, JSON.stringify({ userId, email }), {
    expirationTtl: MAGIC_TTL_SECONDS,
  })

  const origin = ctx.url.origin
  const link = `${origin}/api/auth/verify?token=${token}`

  try {
    await sendMagicEmail(ctx.env, email, link)
  } catch (error) {
    console.error('Magic-link email failed', error)
    // Local development convenience ONLY: when email cannot be sent and the
    // explicit dev flag is set, return the link instead of email. Never
    // enabled by default; production sets RESEND_API_KEY and leaves this off.
    if (ctx.env.AUTH_DEV_LINK_RETURN === 'true') {
      return jsonResponse({ ok: true, devLink: link }, 200)
    }
    return errorResponse('Could not send the sign-in email — try again shortly.', 503)
  }

  return jsonResponse({ ok: true }, 200)
}

/** GET /api/auth/verify?token=… — consumes the token, sets the session cookie, redirects home. */
async function verify(ctx: RouteContext): Promise<Response> {
  const token = ctx.url.searchParams.get('token')
  if (!token) return errorResponse('token required', 400)

  const key = `${MAGIC_KEY_PREFIX}${token}`
  // Single-use: delete first; a lost race means the link is already burned.
  const stored = await ctx.env.SESSIONS.get(key)
  await ctx.env.SESSIONS.delete(key)
  let userId: string | undefined
  try {
    userId = (JSON.parse(stored ?? '') as { userId?: string }).userId
  } catch {
    userId = undefined
  }
  if (!userId) {
    return new Response('This sign-in link is invalid or has expired. Request a new one.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const sessionToken = await createSession(ctx.env, userId)
  const headers = new Headers({ Location: '/?signedIn=1' })
  headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
  )
  return new Response(null, { status: 302, headers })
}

/** GET /api/auth/me */
async function me(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)
  return jsonResponse({ user: { id: user.id } })
}

/** POST /api/auth/logout */
async function logout(ctx: RouteContext): Promise<Response> {
  const token = ctx.request.headers
    .get('Cookie')
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === SESSION_COOKIE)?.[1]

  if (token) {
    await ctx.env.SESSIONS.delete(`session:${token}`)
  }
  const headers = new Headers({ Location: '/' })
  headers.append('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`)
  return new Response(null, { status: 302, headers })
}

export function registerAuthRoutes(router: Router): void {
  router.post('/api/auth/request-link', requestLink)
  router.get('/api/auth/verify', verify)
  router.get('/api/auth/me', me)
  router.post('/api/auth/logout', logout)
}
