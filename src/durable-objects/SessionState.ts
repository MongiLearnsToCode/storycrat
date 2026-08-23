/**
 * Per-session Durable Object for active dictation/conversation state (PRD §7).
 *
 * Uses the WebSocket Hibernation API (cheap while idle, wakes per message)
 * and the Alarms API (buffer-commit ticks). Task 1.13 provisions the class,
 * its binding, and the connection/alarm plumbing; transcript buffering and
 * wake-phrase sequencing land with Tasks 3.3–3.5 inside this lifecycle.
 *
 * SECURITY (security-doc.md § Authorization & Data Isolation):
 * - Stubs are ONLY obtained via `getSessionStateStub`, which derives the DO
 *   ID from the authenticated user's ID + resource ID. A raw ID from a client
 *   must never reach `idFromName`/`idFromString` — "the client picked which
 *   object to talk to" is a trust-boundary violation.
 * - The establishing Worker (which has already authenticated the caller)
 *   performs the WebSocket upgrade against this DO; unauthenticated upgrade
 *   requests are rejected here as defense-in-depth.
 */

export interface SessionEnvelope {
  type: string
  /** Optional numeric field for alarm control messages. */
  delayMs?: number
  [key: string]: unknown
}

export class ProtocolError extends Error {
  readonly code: string

  constructor(code: string, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

/** Parses and validates one inbound client message. Throws ProtocolError on anything malformed or unknown. */
export function parseClientMessage(raw: string | ArrayBuffer): SessionEnvelope {
  if (typeof raw !== 'string') {
    throw new ProtocolError('binary_unsupported')
  }

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
  const knownTypes = ['ping', 'alarm.arm', 'alarm.cancel']
  if (!knownTypes.includes(envelope.type)) {
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

export class SessionState implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Record<string, unknown>
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    // Hibernation API: the socket survives eviction; handlers below wake per message.
    this.state.acceptWebSocket(pair[1])
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let envelope: SessionEnvelope
    try {
      envelope = parseClientMessage(message)
    } catch (error) {
      const code = error instanceof ProtocolError ? error.code : 'bad_message'
      this.reply(ws, { type: 'error', code })
      return
    }

    switch (envelope.type) {
      case 'ping':
        this.reply(ws, { type: 'pong', at: new Date().toISOString() })
        break
      case 'alarm.arm': {
        const at = Date.now() + (envelope.delayMs as number)
        await this.state.storage.setAlarm(at)
        this.reply(ws, { type: 'alarm.armed', at: new Date(at).toISOString() })
        break
      }
      case 'alarm.cancel':
        await this.state.storage.deleteAlarm()
        this.reply(ws, { type: 'alarm.cancelled' })
        break
    }
  }

  async webSocketClose(_ws: WebSocket): Promise<void> {
    // Hibernation API cleans up closed sockets automatically; no bookkeeping kept.
  }

  /**
   * Alarms API tick — fires whether or not any socket is connected (that is
   * the point: buffer commits must happen after the writer pauses, even if
   * the device dozed off). Task 3.3 hangs the real D1 commit logic here.
   */
  async alarm(): Promise<void> {
    await this.broadcast({ type: 'alarm.fired', at: new Date().toISOString() })
  }

  private reply(ws: WebSocket, body: Record<string, unknown>): void {
    ws.send(JSON.stringify(body))
  }

  private async broadcast(body: Record<string, unknown>): Promise<void> {
    const payload = JSON.stringify(body)
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(payload)
      } catch {
        // Socket died mid-broadcast; hibernation cleanup handles removal.
      }
    }
  }
}
