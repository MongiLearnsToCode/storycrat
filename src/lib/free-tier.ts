import type { Env } from '../types'

/**
 * Free-tier tracking and gating (Tasks 5.2–5.3; PRD Req 33–34, 45).
 *
 * `lifetime_script_count` is cumulative per account and NEVER decreases —
 * deleting a script does not restore the allowance. The cap is enforced
 * server-side on every script-creating endpoint; the client at most mirrors
 * it for messaging.
 */

export const FREE_TIER_SCRIPT_LIMIT = 1

export interface TierStatus {
  subscribed: boolean
  lifetimeScriptCount: number
  canCreateScript: boolean
  reason?: 'limit_reached'
}

export async function getTierStatus(env: Env, userId: string): Promise<TierStatus> {
  const [userRow, subRow] = await Promise.all([
    env.DB.prepare('SELECT lifetime_script_count FROM users WHERE id = ?').bind(userId).first<{ lifetime_script_count: number }>(),
    isSubscribed(env, userId),
  ])

  const lifetimeScriptCount = userRow?.lifetime_script_count ?? 0
  const canCreateScript = subRow || lifetimeScriptCount < FREE_TIER_SCRIPT_LIMIT

  return {
    subscribed: subRow,
    lifetimeScriptCount,
    canCreateScript,
    reason: canCreateScript ? undefined : 'limit_reached',
  }
}

/** Active Polar subscription (or trialing) unlocks unlimited scripts. */
export async function isSubscribed(env: Env, userId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT 1 FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')"
  )
    .bind(userId)
    .first()
  return row !== null
}

/**
 * Atomically increments the lifetime count. Called ONLY when a script row is
 * actually created (feature-project creation, episode creation) — never on
 * delete, never speculatively.
 */
export async function incrementLifetimeScriptCount(env: Env, userId: string): Promise<void> {
  await env.DB.prepare(
    'UPDATE users SET lifetime_script_count = lifetime_script_count + 1 WHERE id = ?'
  )
    .bind(userId)
    .run()
}

/** Uniform rejection for the free-tier cap (client shows upgrade messaging). */
export function tierLimitResponse(): Response {
  return new Response(
    JSON.stringify({
      error:
        'Free tier limit reached — your allowance covers one script (or one TV episode). Upgrade for unlimited scripts.',
      code: 'free_tier_limit',
    }),
    { status: 402, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  )
}
