import type { Env } from '../types'
import type { RouteContext, Router } from '../index'
import { errorResponse, jsonResponse } from '../index'
import { requireUser } from '../lib/auth'
import { getTierStatus, isSubscribed } from '../lib/free-tier'

/**
 * Polar billing (Tasks 5.4–5.5; security-doc.md § Billing).
 *
 * Subscription state comes ONLY from verified Polar webhooks — never from
 * client input. Checkout sessions are created server-side with the Polar
 * access token; the browser only ever receives a checkout URL.
 */

const POLAR_API = 'https://api.polar.sh'

/** GET /api/billing/subscription — tier status for UI messaging. */
async function subscriptionStatus(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const status = await getTierStatus(ctx.env, user.id)
  const row = await ctx.env.DB.prepare(
    'SELECT status, plan, current_period_end FROM subscriptions WHERE user_id = ?'
  )
    .bind(user.id)
    .first<{ status: string; plan: string; current_period_end: string | null }>()

  return jsonResponse({
    ...status,
    plan: row?.plan ?? null,
    subscriptionStatus: row?.status ?? null,
    currentPeriodEnd: row?.current_period_end ?? null,
  })
}

/** POST /api/billing/checkout — creates a Polar checkout for the paid tier. */
async function createCheckout(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request, ctx.env)
  if (!user) return errorResponse('Unauthorized', 401)

  const productId = ctx.env.POLAR_PRODUCT_ID
  if (!productId) return errorResponse('Billing is not configured yet', 503)

  if (await isSubscribed(ctx.env, user.id)) {
    return jsonResponse({ checkoutUrl: null, alreadySubscribed: true })
  }

  const response = await fetch(`${POLAR_API}/v1/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.env.POLAR_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      products: [productId],
      success_url: `${ctx.url.origin}/?subscribed=1`,
      metadata: { userId: user.id },
    }),
  })
  if (!response.ok) {
    console.error('Polar checkout creation failed', await response.text().catch(() => ''))
    return errorResponse('Could not start checkout — try again shortly.', 503)
  }

  const body = (await response.json()) as { url?: string }
  if (!body.url) return errorResponse('Could not start checkout — try again shortly.', 503)

  return jsonResponse({ checkoutUrl: body.url }, 201)
}

// ---- Webhook (svix-style signature scheme used by Polar) -------------------

async function verifyWebhookSignature(
  secret: string,
  id: string | null,
  timestamp: string | null,
  signatureHeader: string | null,
  rawBody: string
): Promise<boolean> {
  if (!id || !timestamp || !signatureHeader) return false

  // Replay window: 5 minutes.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signedContent = `${id}.${timestamp}.${rawBody}`
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))

  // Header format: "v1,<base64 signature>" (possibly multiple, space separated).
  const provided = signatureHeader
    .split(' ')
    .map((part) => part.replace(/^v1,/, '').trim())
    .filter(Boolean)

  return provided.some((sig) => {
    if (sig.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
    }
    return diff === 0
  })
}

interface PolarWebhookEvent {
  type: string
  data?: {
    id?: string
    status?: string
    customer?: { email?: string }
    product?: { name?: string } | string
    current_period_end?: string
    metadata?: { userId?: string }
  }
}

async function resolveUserId(env: Env, event: PolarWebhookEvent): Promise<string | null> {
  const metadataUserId = event.data?.metadata?.userId
  if (metadataUserId) {
    const row = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(metadataUserId).first<{ id: string }>()
    if (row) return row.id
  }
  const email = event.data?.customer?.email
  if (email) {
    const row = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first<{ id: string }>()
    if (row) return row.id
  }
  return null
}

/** POST /api/billing/webhook — the ONLY writer of subscription state. */
async function webhook(ctx: RouteContext): Promise<Response> {
  const secret = ctx.env.POLAR_WEBHOOK_SECRET
  if (!secret) return errorResponse('Webhooks not configured', 503)

  const rawBody = await ctx.request.text()
  const valid = await verifyWebhookSignature(
    secret,
    ctx.request.headers.get('svix-id'),
    ctx.request.headers.get('svix-timestamp'),
    ctx.request.headers.get('svix-signature'),
    rawBody
  )
  if (!valid) return errorResponse('Invalid signature', 403)

  let event: PolarWebhookEvent
  try {
    event = JSON.parse(rawBody) as PolarWebhookEvent
  } catch {
    return errorResponse('Invalid payload', 400)
  }

  const userId = await resolveUserId(ctx.env, event)
  const subscriptionId = event.data?.id
  if (!userId || !subscriptionId) {
    // Acknowledge events we can't attribute so Polar doesn't retry forever.
    return jsonResponse({ ok: true, ignored: true })
  }

  const status = event.type === 'subscription.canceled' ? 'canceled' : (event.data?.status ?? 'active')
  const plan = typeof event.data?.product === 'object' ? (event.data.product?.name ?? '') : (event.data?.product ?? '')
  const periodEnd = event.data?.current_period_end ?? null

  // Only active/trialing states grant access; canceled/past_due do not.
  const grantsAccess = status === 'active' || status === 'trialing'

  if (grantsAccess) {
    await ctx.env.DB.prepare(
      `INSERT INTO subscriptions (user_id, polar_subscription_id, status, plan, current_period_end)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         polar_subscription_id = excluded.polar_subscription_id,
         status = excluded.status,
         plan = excluded.plan,
         current_period_end = excluded.current_period_end,
         updated_at = datetime('now')`
    )
      .bind(userId, subscriptionId, status, plan, periodEnd)
      .run()
  } else {
    await ctx.env.DB.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(userId).run()
  }

  return jsonResponse({ ok: true })
}

export function registerBillingRoutes(router: Router): void {
  router.get('/api/billing/subscription', subscriptionStatus)
  router.post('/api/billing/checkout', createCheckout)
  router.post('/api/billing/webhook', webhook)
}
