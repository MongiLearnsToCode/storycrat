import type { Env } from '../types'
import { requireSecret } from './secrets'

/**
 * Short-lived signed download links for exported PDFs (Task 2.8).
 *
 * R2 bindings can't mint presigned URLs directly, so links are HMAC-signed
 * capabilities to our own streaming endpoint: possession of a valid,
 * unexpired signature grants download of exactly one object key. Signatures
 * are compared in constant time.
 */

const DOWNLOAD_PREFIX = '/api/exports/'

export interface SignedLink {
  path: string
  expiresAt: number
}

export async function createSignedDownloadLink(env: Env, objectKey: string, ttlSeconds = 300): Promise<SignedLink> {
  const secret = requireSecret(env, 'PDF_SIGNING_SECRET')
  const expiresAt = Date.now() + ttlSeconds * 1000
  const signature = await sign(secret, objectKey, expiresAt)
  return {
    path: `${DOWNLOAD_PREFIX}${encodeURIComponent(objectKey)}?expires=${expiresAt}&signature=${signature}`,
    expiresAt,
  }
}

export interface VerifiedDownload {
  objectKey: string
}

/** Returns the object key for a valid, unexpired link — or null for anything tampered/expired. */
export async function verifySignedDownload(request: Request, env: Env): Promise<VerifiedDownload | null> {
  const secret = requireSecret(env, 'PDF_SIGNING_SECRET')
  const url = new URL(request.url)

  if (!url.pathname.startsWith(DOWNLOAD_PREFIX)) return null

  const encodedKey = url.pathname.slice(DOWNLOAD_PREFIX.length)
  if (!encodedKey) return null

  const expiresRaw = url.searchParams.get('expires')
  const signature = url.searchParams.get('signature')
  if (!expiresRaw || !signature) return null

  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null

  let objectKey: string
  try {
    objectKey = decodeURIComponent(encodedKey)
  } catch {
    return null
  }

  // Reject path traversal into other namespaces before any crypto work.
  if (objectKey.includes('..') || objectKey.startsWith('/')) return null

  const expected = await sign(secret, objectKey, expiresAt)
  const matches = timingSafeEqualHex(expected, signature)
  if (!matches) return null

  return { objectKey }
}

async function sign(secret: string, objectKey: string, expiresAt: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${objectKey}:${expiresAt}`))
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
