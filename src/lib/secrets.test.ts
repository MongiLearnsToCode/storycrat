import { describe, expect, it } from 'vitest'
import { MissingSecretError, hasSecret, requireSecret } from './secrets'

const env = {
  DB: {} as D1Database,
  SESSIONS: {} as KVNamespace,
  PDFS: {} as R2Bucket,
  GROQ_API_KEY: 'gsk-test',
  POLAR_WEBHOOK_SECRET: '',
} as unknown as import('../types').Env

describe('hasSecret', () => {
  it('returns true for a non-empty secret', () => {
    expect(hasSecret(env, 'GROQ_API_KEY')).toBe(true)
  })

  it('returns false for missing and empty-string secrets', () => {
    expect(hasSecret(env, 'RESEND_API_KEY')).toBe(false)
    expect(hasSecret(env, 'POLAR_WEBHOOK_SECRET')).toBe(false)
  })
})

describe('requireSecret', () => {
  it('returns the value when configured', () => {
    expect(requireSecret(env, 'GROQ_API_KEY')).toBe('gsk-test')
  })

  it('throws MissingSecretError with the exact wrangler command when unconfigured', () => {
    try {
      requireSecret(env, 'DEEPGRAM_API_KEY')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(MissingSecretError)
      expect((error as MissingSecretError).message).toContain('wrangler secret put DEEPGRAM_API_KEY')
    }
  })
})
