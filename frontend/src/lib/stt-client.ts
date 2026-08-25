
/**
 * Browser-side streaming dictation client (Task 3.2).
 *
 * Captures microphone audio via MediaRecorder and streams binary chunks over
 * a WebSocket to the Worker's /api/dictation endpoint. The key never touches
 * the browser; audio bytes are relayed server-side to Deepgram and discarded
 * after transcription (PRD §7).
 */

export type DictationState = 'idle' | 'connecting' | 'listening' | 'paused' | 'stopped'

export interface DictationEvents {
  onSegment?: (text: string) => void
  onElementsUpdated?: () => void
  onCommandExecuted?: (description: string) => void
  onCommandNotRecognized?: (heard: string) => void
  onUndoAvailable?: () => void
  onUndoRestored?: () => void
  onStatus?: (state: DictationState) => void
  onError?: (code: string) => void
}

interface SocketMessage extends Record<string, unknown> {
  type: string
  text?: string
  description?: string
  heard?: string
}

// Safari MediaRecorder emits audio/mp4 (no webm); Chrome/Firefox prefer opus/webm.
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'] as const

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
}

export class DictationClient {
  private ws: WebSocket | null = null
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private events: DictationEvents

  state: DictationState = 'idle'

  constructor(private readonly scriptId: string, events: DictationEvents = {}) {
    this.events = events
  }

  private setState(state: DictationState): void {
    this.state = state
    this.events.onStatus?.(state)
  }

  async start(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped') return

    this.setState('connecting')

    // Mic permission FIRST — a denial must surface as the persistent
    // mic-denied state, not a generic error (DESIGN.md → System Status).
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch {
      this.setState('stopped')
      this.events.onError?.('mic_denied')
      return
    }

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/api/dictation?scriptId=${encodeURIComponent(this.scriptId)}`)
    this.ws = ws

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as SocketMessage
      switch (message.type) {
        case 'session.ready':
          this.announceAudioFormat()
          break
        case 'listening':
          this.startRecorder()
          break
        case 'dictation.segment':
          this.events.onSegment?.(message.text ?? '')
          break
        case 'elements.updated':
          this.events.onElementsUpdated?.()
          break
        case 'command.executed':
          this.events.onCommandExecuted?.(message.description ?? '')
          break
        case 'command.not_recognized':
          this.events.onCommandNotRecognized?.(message.heard ?? '')
          break
        case 'undo.available':
          this.events.onUndoAvailable?.()
          break
        case 'undo.restored':
          this.events.onUndoRestored?.()
          break
        case 'status.reconnecting':
          this.events.onError?.('reconnecting')
          break
        case 'error':
          this.events.onError?.(String(message.code ?? 'unknown'))
          break
      }
    })

    ws.addEventListener('close', () => {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
      this.stream?.getTracks().forEach((track) => track.stop())
      this.setState('stopped')
    })
  }

  private announceAudioFormat(): void {
    const mimeType = pickMimeType()
    this.ws?.send(JSON.stringify({ type: 'audio.config', mimeType }))
  }

  private startRecorder(): void {
    if (!this.stream) return
    const mimeType = pickMimeType()

    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    } catch {
      this.events.onError?.('mic_denied')
      return
    }
    this.recorder = recorder

    // Raw opus/webm chunks relayed verbatim; nothing is cached or stored.
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        void event.data.arrayBuffer().then((buffer) => {
          this.ws?.send(buffer)
        })
      }
    })

    recorder.start(250)
    this.setState('listening')
  }

  pause(): void {
    if (this.state !== 'listening') return
    this.recorder?.pause()
    this.ws?.send(JSON.stringify({ type: 'pause' }))
    this.setState('paused')
  }

  resume(): void {
    if (this.state !== 'paused') return
    this.recorder?.resume()
    this.ws?.send(JSON.stringify({ type: 'resume' }))
    this.setState('listening')
  }

  stop(): void {
    if (this.state === 'idle') return
    this.ws?.send(JSON.stringify({ type: 'stop' }))
    this.recorder?.stop()
    this.stream?.getTracks().forEach((track) => track.stop())
    this.setState('stopped')
  }

  undo(): void {
    this.ws?.send(JSON.stringify({ type: 'undo' }))
  }
}
