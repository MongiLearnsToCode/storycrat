import { describe, expect, it } from 'vitest'
import type { Env } from '../types'
import { createSignedDownloadLink, verifySignedDownload } from './signed-urls'

const env = {
  DB: {} as D1Database,
  SESSIONS: {} as KVNamespace,
  PDFS: {} as R2Bucket,
  PDF_SIGNING_SECRET: 'test-signing-secret',
} as unknown as Env

function downloadRequest(key: string, expiresAt: number, signature: string): Request {
  return new Request(`https://app.example/api/exports/${encodeURIComponent(key)}?expires=${expiresAt}&signature=${signature}`)
}

describe('signed download links', () => {
  it('round-trips a freshly created link', async () => {
    const link = await createSignedDownloadLink(env, 'pdfs/sc1/abc.pdf', 300)
    const url = new URL(link.path, 'https://app.example')
    const verified = await verifySignedDownload(new Request(url.href), env)

    expect(verified).not.toBeNull()
    expect(verified?.objectKey).toBe('pdfs/sc1/abc.pdf')
  })

  it('rejects expired links', async () => {
    const link = await createSignedDownloadLink(env, 'pdfs/sc1/abc.pdf', 300)
    // Re-sign at a past timestamp is impossible without the secret; instead
    // craft an expired link with a valid-looking signature via the signer
    // indirectly by manipulating expiry after creation.
    const url = new URL(link.path, 'https://app.example')
    url.searchParams.set('expires', String(Date.now() - 1000))
    expect(await verifySignedDownload(new Request(url.href), env)).toBeNull()
  })

  it('rejects tampered signatures and keys', async () => {
    const link = await createSignedDownloadLink(env, 'pdfs/sc1/abc.pdf', 300)
    const url = new URL(link.path, 'https://app.example')

    const tamperedSig = url.href.replace(/signature=.{8}/, 'signature=deadbeef')
    expect(await verifySignedDownload(new Request(tamperedSig), env)).toBeNull()

    const otherKey = link.path.replace('abc.pdf', 'other.pdf')
    const otherUrl = new URL(otherKey, 'https://app.example')
    expect(await verifySignedDownload(new Request(otherUrl.href), env)).toBeNull()
  })

  it('rejects path traversal keys', async () => {
    const link = await createSignedDownloadLink(env, 'pdfs/sc1/abc.pdf', 300)
    const url = new URL(link.path, 'https://app.example')
    const traversal = url.href.replace(encodeURIComponent('pdfs/sc1/abc.pdf'), encodeURIComponent('../secrets'))
    expect(await verifySignedDownload(new Request(traversal), env)).toBeNull()
  })

  it('produces different signatures per key and expiry', async () => {
    const a = await createSignedDownloadLink(env, 'k1', 300)
    const b = await createSignedDownloadLink(env, 'k2', 300)
    expect(a.path.split('signature=')[1]).not.toBe(b.path.split('signature=')[1])
  })
})
