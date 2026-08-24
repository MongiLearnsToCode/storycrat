import type { Env } from '../types'

/**
 * Client/session message protocol for the dictation WebSocket.
 * Unknown or malformed messages produce typed errors — never guesses
 * (PRD Req 18 applies to control messages too).
 */

export interface SessionEnvelope {
  type: string
  delayMs?: number
}

export class ProtocolError extends Error {
  readonly code: string

  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'ProtocolError'
    this.code = code
  }
}

export const CLIENT_MESSAGE_TYPES = [
  'ping',
  'audio.config',
  'pause',
  'resume',
  'stop',
  'undo',
  'alarm.arm',
  'alarm.cancel',
] as const

export function parseClientMessage(raw: string): SessionEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ProtocolError('bad_json')
  }

  if (typeof parsed !== 'object' || parsed === null || typeof (parsed as SessionEnvelope).type !== 'string') {
    throw new ProtocolError('missing_type')
  }

  const envelope = parsed as SessionEnvelope
  if (!(CLIENT_MESSAGE_TYPES as readonly string[]).includes(envelope.type)) {
    throw new ProtocolError('unknown_type', `Unknown message type: ${envelope.type}`)
  }

  if (envelope.type === 'alarm.arm') {
    const delay = envelope.delayMs
    if (typeof delay !== 'number' || !Number.isFinite(delay) || delay < 100 || delay > 120_000) {
      throw new ProtocolError('invalid_delay', 'delayMs must be a number between 100 and 120000')
    }
  }

  return envelope
}
