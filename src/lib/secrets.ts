import type { Env, SecretName } from '../types'

/**
 * Typed access to configured secrets (security-doc.md § Secrets Management).
 *
 * Fails loudly with a dedicated error type at the feature boundary rather
 * than letting an undefined key leak into an outbound provider call where it
 * would fail as a confusing 401 from the third party.
 */
export class MissingSecretError extends Error {
  readonly secretName: SecretName

  constructor(secretName: SecretName) {
    super(`Required secret "${secretName}" is not configured. Set it with \`wrangler secret put ${secretName}\`.`)
    this.name = 'MissingSecretError'
    this.secretName = secretName
  }
}

export function hasSecret(env: Env, name: SecretName): boolean {
  const value = env[name]
  return typeof value === 'string' && value.length > 0
}

export function requireSecret(env: Env, name: SecretName): string {
  const value = env[name]
  if (!hasSecret(env, name)) {
    throw new MissingSecretError(name)
  }
  return value as string
}
