import type { Env } from '../types'
import { parseClientMessage, ProtocolError, type SessionEnvelope } from './protocol'

// Test-compat re-exports (the 1.13 suite imports these from this module).
export { parseClientMessage, ProtocolError }
import { splitAtWakePhrase } from '../lib/wake-phrase-detector'
import { parseCommand, describeCommand } from '../lib/voice-command-parser'
import { classifyBufferedText, type ClassifiedElement } from '../lib/element-classifier'
import { resyncScriptSafely } from '../lib/embed-sync'

/**
 * Per-session Durable Object for active dictation state (PRD §7).
 *
 * Responsibilities (Tasks 3.3–3.9):
 * - Owns the writer's WebSocket (Hibernation API) and the outbound Deepgram
 *   streaming socket. Binary frames are relayed to Deepgram and DISCARDED
 *   after transit — audio is never persisted anywhere (3.13).
 * - Buffers finalized segments; the "Partner" wake-phrase scan runs on every
 *   segment BEFORE any commit; a mid-buffer phrase commits only pre-phrase
 *   content as dictation and routes the remainder to command parsing (3.5).
 * - Alarms commit buffered text at pause boundaries; sentence-ending segments
 *   and explicit stop flush immediately (3.3). The buffer survives
 *   hibernation via DO storage.
 * - Committed text is classified in ONE batched LLM call per commit (3.4)
 *   and appended to D1; voice commands mutate D1 with full-snapshot undo
 *   (3.6–3.8); unrecognized commands surface as errors (3.9).
 *
 * SECURITY: stubs ONLY via getSessionStateStub — the object ID embeds the
 * authenticated user's ID.
 */

const PAUSE_COMMIT_MS = 2000
const MAX_BUFFER_CHARS = 20_000

interface ClientSocketMeta {
  scriptId: string
  deepgram?: WebSocket
}

export class SessionState {
  private loaded = false
  private buffer = ''
  private scriptIdHint: string | null = null

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  private async hydrate(): Promise<void> {
    if (this.loaded) return
    this.buffer = (await this.state.storage.get<string>('buffer')) ?? ''
    this.scriptIdHint = (await this.state.storage.get<string>('scriptId')) ?? null
    this.loaded = true
  }

  private async persist(): Promise<void> {
    await this.state.storage.put('buffer', this.buffer)
  }

  // ---- HTTP surface ---------------------------------------------------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const scriptId = url.searchParams.get('scriptId')
      if (!scriptId) return new Response('scriptId required', { status: 400 })
      return this.handleUpgrade(url, scriptId)
    }
    if (request.method === 'POST' && url.pathname.endsWith('/flush')) {
      await this.hydrate()
      await this.flushBuffer()
      return new Response(null, { status: 204 })
    }
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  private handleUpgrade(url: URL, scriptId: string): Response {
    const pair = new WebSocketPair()
    const server = pair[1] as WebSocket & { meta?: ClientSocketMeta }
    server.meta = { scriptId }
    this.state.acceptWebSocket(server)

    void (async () => {
      await this.hydrate()
      await this.state.storage.put('scriptId', scriptId)
      this.scriptIdHint = scriptId
      this.send(server, { type: 'session.ready', scriptId })
    })()

    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  private metaOf(ws: WebSocket): ClientSocketMeta {
    const meta = (ws as WebSocket & { meta?: ClientSocketMeta }).meta
    if (!meta) throw new Error('Socket missing session metadata')
    return meta
  }

  // ---- WebSocket messages ------------------------------------------------------

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.hydrate()
    const meta = this.metaOf(ws)

    // Binary frames are raw microphone audio destined for Deepgram only.
    if (typeof message !== 'string') {
      try {
        await this.ensureDeepgram(meta)
        meta.deepgram?.send(message)
      } catch {
        this.send(ws, { type: 'error', code: 'stt_unavailable' })
      }
      return
    }

    let envelope: SessionEnvelope
    try {
      envelope = parseClientMessage(message)
    } catch (error) {
      const code = error instanceof ProtocolError ? error.code : 'bad_message'
      this.send(ws, { type: 'error', code })
      return
    }

    switch (envelope.type) {
      case 'ping':
        this.send(ws, { type: 'pong' })
        break
      case 'audio.config':
        await this.ensureDeepgram(meta)
        this.send(ws, { type: 'listening' })
        break
      case 'pause':
        meta.deepgram?.send(JSON.stringify({ type: 'Pause' }))
        break
      case 'resume':
        meta.deepgram?.send(JSON.stringify({ type: 'Resume' }))
        break
      case 'stop':
        await this.flushBuffer()
        this.send(ws, { type: 'stopped' })
        break
      case 'undo':
        await this.undoLastDelete()
        break
      case 'alarm.arm': {
        const at = Date.now() + (envelope.delayMs ?? PAUSE_COMMIT_MS)
        await this.state.storage.setAlarm(at)
        break
      }
      case 'alarm.cancel':
        await this.state.storage.deleteAlarm()
        break
    }
  }

  async webSocketClose(_ws: WebSocket): Promise<void> {
    // Stop semantics on disconnect: commit whatever was dictated (3.3).
    await this.hydrate()
    await this.flushBuffer()
  }

  /**
   * Alarms tick, in priority order:
   * 1. Pause-boundary commit of buffered dictation (wake sequencing applies).
   * 2. Debounced embedding sync for mutated scripts (Task 4.13) — batched
   *    here so voice edits don't fire per keystroke.
   */
  async alarm(): Promise<void> {
    await this.hydrate()
    await this.flushBuffer()

    const pending = (await this.state.storage.get<string[]>('embedPending')) ?? []
    if (pending.length > 0) {
      await this.state.storage.delete('embedPending')
      for (const scriptId of pending.slice(0, 5)) {
        await resyncScriptSafely(this.env, scriptId)
      }
    }
  }

  /** Arms the next alarm (≥30s out) to run a debounced embedding sync. */
  private async markEmbeddingDirty(scriptId: string): Promise<void> {
    const pending = new Set((await this.state.storage.get<string[]>('embedPending')) ?? [])
    pending.add(scriptId)
    await this.state.storage.put('embedPending', Array.from(pending))

    const existing = await this.state.storage.getAlarm()
    if (existing === null) {
      // Don't disturb an imminent pause-commit; just make sure a sync lands.
      await this.state.storage.setAlarm(Date.now() + 30_000)
    }
  }

  // ---- Deepgram bridge -----------------------------------------------------------

  private ensureDeepgram(meta: ClientSocketMeta): Promise<void> {
    if (meta.deepgram && meta.deepgram.readyState === WebSocket.OPEN) return Promise.resolve()
    if ((meta as ClientSocketMeta & { connecting?: Promise<void> }).connecting) {
      return (meta as ClientSocketMeta & { connecting: Promise<void> }).connecting
    }

    const key = this.env.DEEPGRAM_API_KEY
    if (!key) {
      this.sendToAll({ type: 'status.error', code: 'stt_unconfigured' })
      return Promise.reject(new Error('DEEPGRAM_API_KEY not configured'))
    }

    const connecting = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=false&punctuate=true',
        ['token', key]
      )
      meta.deepgram = ws

      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', () => {
        console.error('Deepgram socket error')
        this.sendToAll({ type: 'status.reconnecting' })
        reject(new Error('Deepgram connection failed'))
      })

      ws.addEventListener('message', (event) => {
        void this.onDeepgramMessage(String(event.data))
      })
    })
    ;(meta as ClientSocketMeta & { connecting?: Promise<void> }).connecting = connecting
    return connecting
  }

  private async onDeepgramMessage(raw: string): Promise<void> {
    let transcript = ''
    try {
      const parsed = JSON.parse(raw) as { channel?: { alternatives?: Array<{ transcript?: string }> } }
      transcript = parsed.channel?.alternatives?.[0]?.transcript?.trim() ?? ''
    } catch {
      return
    }
    if (!transcript) return

    // Finalized text enters the pipeline; interim results are disabled.
    this.sendToAll({ type: 'dictation.segment', text: transcript })
    await this.ingestSegment(transcript)
  }

  // ---- Buffered dictation pipeline -------------------------------------------------

  /** Ingests one finalized segment. Wake scan happens here, PRE-commit (3.5). */
  public async ingestSegment(segment: string): Promise<void> {
    await this.hydrate()

    this.buffer = this.buffer ? `${this.buffer} ${segment}` : segment
    await this.persist()

    const split = splitAtWakePhrase(this.buffer)

    if (!split) {
      if (/[.?!]$/.test(this.buffer.trim()) || this.buffer.length > MAX_BUFFER_CHARS) {
        const text = this.buffer
        this.buffer = ''
        await this.persist()
        await this.commitContent(text)
      } else {
        // Arm a single pause-commit alarm if none is pending.
        if ((await this.state.storage.getAlarm()) === null) {
          await this.state.storage.setAlarm(Date.now() + PAUSE_COMMIT_MS)
        }
      }
      return
    }

    this.buffer = ''
    await this.persist()
    if (split.content) {
      await this.commitContent(split.content)
    }
    await this.executeCommandText(split.commandText)
  }

  /** Stop / close / pause-alarm path: everything still buffered resolves now. */
  public async flushBuffer(): Promise<void> {
    await this.hydrate()
    const text = this.buffer
    if (!text.trim()) return
    this.buffer = ''
    await this.persist()

    // Even at stop, a late wake phrase splits rather than leaking into D1.
    const split = splitAtWakePhrase(text)
    if (!split) {
      await this.commitContent(text)
      return
    }
    if (split.content) await this.commitContent(split.content)
    await this.executeCommandText(split.commandText)
  }

  private async commitContent(text: string): Promise<void> {
    if (!text.trim()) return
    const elements = await this.classify(text)
    await this.appendElements(elements)
    this.sendToAll({ type: 'elements.updated', committed: elements.length })
  }

  /** Injectable for tests; production uses the batched LLM classifier. */
  public classify: (text: string) => Promise<ClassifiedElement[]> = (text) => classifyBufferedText(this.env, text)

  // ---- D1 mutations -----------------------------------------------------------------

  private async appendElements(elements: ClassifiedElement[]): Promise<void> {
    if (elements.length === 0) return
    const scriptId = await this.currentScriptId()
    if (!scriptId) return
    await this.markEmbeddingDirty(scriptId)

    const maxRow = await this.env.DB.prepare('SELECT COALESCE(MAX(position), -1) AS p FROM script_elements WHERE script_id = ?')
      .bind(scriptId)
      .first<{ p: number }>()
    let position = (maxRow?.p ?? -1) + 1

    await this.env.DB.batch(
      elements.map((el) =>
        this.env.DB.prepare(
          'INSERT INTO script_elements (id, script_id, position, type, content) VALUES (?, ?, ?, ?, ?)'
        ).bind(crypto.randomUUID(), scriptId, position++, el.type, el.content)
      )
    )
  }

  private async currentScriptId(): Promise<string | null> {
    const sockets = this.state.getWebSockets()
    const first = sockets[0]
    if (first) return this.metaOf(first).scriptId
    if (this.scriptIdHint) return this.scriptIdHint
    const stored = await this.state.storage.get<{ scriptId?: string }>('session')
    return stored?.scriptId ?? null
  }

  // ---- Voice commands ------------------------------------------------------------------

  private async executeCommandText(commandText: string): Promise<void> {
    const command = parseCommand(commandText)

    if (!command) {
      this.sendToAll({ type: 'command.not_recognized', heard: commandText })
      return
    }

    const scriptId = await this.currentScriptId()
    if (!scriptId) {
      this.sendToAll({ type: 'command.not_recognized', heard: commandText })
      return
    }

    switch (command.kind) {
      case 'new_scene':
        await this.appendElements([{ type: 'scene_heading', content: (command.heading ?? 'INT. - DAY').toUpperCase() }])
        break
      case 'transition':
        await this.appendElements([
          { type: 'transition', content: `CUT TO:${command.destination ? ` ${command.destination.toUpperCase()}` : ''}` },
        ])
        break
      case 'insert_action':
        await this.appendElements([{ type: 'action', content: command.text }])
        break
      case 'delete_last_line':
        await this.destructive(scriptId, () => this.deleteLastLine(scriptId))
        break
      case 'delete_last_scene':
        await this.destructive(scriptId, () => this.deleteLastScene(scriptId))
        break
      case 'retag_last':
        await this.retagLast(scriptId, command.to)
        break
      case 'set_scene_heading':
        await this.setLatestSceneHeading(scriptId, command.text.toUpperCase())
        break
    }

    this.sendToAll({ type: 'command.executed', description: describeCommand(command), kind: command.kind })
    this.sendToAll({ type: 'elements.updated', committed: 0 })
  }

  /** Snapshot-undo for destructive commands (PRD Req 17 / Task 3.8). */
  private async destructive(scriptId: string, operation: () => Promise<boolean>): Promise<void> {
    const rows = await this.listElements(scriptId)
    const snapshot = JSON.stringify(rows)
    await this.state.storage.put('undoSnapshot', snapshot)

    const changed = await operation()
    if (changed) {
      this.sendToAll({ type: 'undo.available' })
    } else {
      await this.state.storage.delete('undoSnapshot')
      this.sendToAll({ type: 'command.noop', description: 'Nothing to delete' })
    }
  }

  private async undoLastDelete(): Promise<void> {
    const snapshot = await this.state.storage.get<string>('undoSnapshot')
    if (!snapshot) {
      this.sendToAll({ type: 'command.noop', description: 'Nothing to undo' })
      return
    }
    const scriptId = await this.currentScriptId()
    if (!scriptId) return

    const rows = JSON.parse(snapshot) as Array<{ id: string; position: number; type: string; content: string }>
    await this.env.DB.batch([
      this.env.DB.prepare('DELETE FROM script_elements WHERE script_id = ?').bind(scriptId),
      ...rows.map((row) =>
        this.env.DB.prepare(
          'INSERT INTO script_elements (id, script_id, position, type, content) VALUES (?, ?, ?, ?, ?)'
        ).bind(row.id, scriptId, row.position, row.type, row.content)
      ),
    ])
    await this.markEmbeddingDirty(scriptId)

    await this.state.storage.delete('undoSnapshot')
    this.sendToAll({ type: 'undo.restored' })
    this.sendToAll({ type: 'elements.updated', committed: 0 })
  }

  private async listElements(scriptId: string): Promise<Array<{ id: string; position: number; type: string; content: string }>> {
    const { results } = await this.env.DB.prepare(
      'SELECT id, position, type, content FROM script_elements WHERE script_id = ? ORDER BY position ASC'
    )
      .bind(scriptId)
      .all<{ id: string; position: number; type: string; content: string }>()
    return results ?? []
  }

  private async deleteLastLine(scriptId: string): Promise<boolean> {
    const rows = await this.listElements(scriptId)
    const last = rows[rows.length - 1]
    if (!last) return false
    await this.markEmbeddingDirty(scriptId)
    await this.env.DB.prepare('DELETE FROM script_elements WHERE id = ?').bind(last.id).run()
    return true
  }

  private async deleteLastScene(scriptId: string): Promise<boolean> {
    const rows = await this.listElements(scriptId)
    let lastHeadingIdx = -1
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i]?.type === 'scene_heading') {
        lastHeadingIdx = i
        break
      }
    }
    if (lastHeadingIdx === -1) return false
    const doomed = rows.slice(lastHeadingIdx)
    await this.markEmbeddingDirty(scriptId)
    await this.env.DB.batch(doomed.map((row) => this.env.DB.prepare('DELETE FROM script_elements WHERE id = ?').bind(row.id)))
    return true
  }

  private async retagLast(scriptId: string, to: string): Promise<void> {
    const rows = await this.listElements(scriptId)
    const last = rows[rows.length - 1]
    if (!last) return
    await this.markEmbeddingDirty(scriptId)
    await this.env.DB.prepare("UPDATE script_elements SET type = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(to, last.id)
      .run()
  }

  private async setLatestSceneHeading(scriptId: string, heading: string): Promise<void> {
    const rows = await this.listElements(scriptId)
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i]
      if (row?.type === 'scene_heading') {
        await this.markEmbeddingDirty(scriptId)
        await this.env.DB.prepare("UPDATE script_elements SET content = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(heading, row.id)
          .run()
        return
      }
    }
    await this.appendElements([{ type: 'scene_heading', content: heading }])
  }

  // ---- Messaging -----------------------------------------------------------------------

  private send(ws: WebSocket, body: Record<string, unknown>): void {
    try {
      ws.send(JSON.stringify(body))
    } catch {
      // Socket died mid-send; hibernation cleanup handles removal.
    }
  }

  private sendToAll(body: Record<string, unknown>): void {
    for (const ws of this.state.getWebSockets()) {
      this.send(ws, body)
    }
  }
}
