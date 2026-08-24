import { cn } from '@/lib/utils'
import type { DictationState } from '@/lib/stt-client'

/**
 * System Status states (Task 3.12; DESIGN.md → Components → System Status).
 * These are functional signals the writer relies on — deliberately NOT one
 * generic alert component:
 * - Mic denied: persistent, non-dismissible until resolved.
 * - Reconnecting: recording-red pulsing dot context (rendered by callers on
 *   the Active Recording Bar) plus this banner explanation.
 * - Rate limit: distinct "try again shortly" tone, never a broken-app feel.
 */
export type StatusState =
  | { kind: 'mic_denied' }
  | { kind: 'reconnecting' }
  | { kind: 'rate_limited' }
  | null

export function StatusBanner({ status }: { status: StatusState }) {
  if (!status) return null

  if (status.kind === 'mic_denied') {
    return (
      <div
        role="alert"
        data-status="mic-denied"
        className="flex items-center gap-3 rounded border border-recording-red/50 bg-recording-red/10 px-4 py-3 font-ui text-sm text-on-surface"
      >
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-recording-red" />
        <span>
          Microphone access is blocked. Dictation needs mic access — allow it in your browser’s site settings, then start again.
        </span>
      </div>
    )
  }

  if (status.kind === 'reconnecting') {
    return (
      <div
        role="status"
        data-status="reconnecting"
        className="flex items-center gap-3 rounded border border-outline-variant bg-container px-4 py-3 font-ui text-sm text-on-surface"
      >
        <span aria-hidden className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-recording-red opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-recording-red" />
        </span>
        <span>Connection to transcription lost — reconnecting. Your last words are still buffered.</span>
      </div>
    )
  }

  return (
    <div
      role="status"
      data-status="rate-limited"
      className="flex items-center gap-3 rounded border border-creative-spark-amber/50 bg-creative-spark-amber/10 px-4 py-3 font-ui text-sm text-on-surface"
    >
      <span aria-hidden className="text-base leading-none">✦</span>
      <span>The AI is catching its breath (rate limit). Try again in a moment — nothing you dictated was lost.</span>
    </div>
  )
}

/**
 * Active Recording Bar (DESIGN.md → The Editor): two visually distinct
 * states — Dictation (recording-red pulse) vs Command Mode
 * (creative-spark-blue pulse) — so the writer can tell at a glance whether
 * speech becomes content or commands.
 */
export function RecordingBar({ state, interimText }: { state: DictationState; interimText: string }) {
  const active = state === 'listening' || state === 'paused'
  if (!active && !interimText) return null

  return (
    <div
      data-state={state}
      className={cn(
        'sticky bottom-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-3 font-ui text-sm',
        state === 'listening' && 'bg-recording-red/15',
        state === 'paused' && 'bg-container',
        !active && 'bg-transparent'
      )}
    >
      {(state === 'listening' || state === 'paused') && (
        <span
          aria-hidden
          className={cn(
            'relative flex h-2.5 w-2.5',
            state === 'listening' && 'animate-pulse rounded-full bg-recording-red',
            state === 'paused' && 'rounded-full bg-outline'
          )}
        />
      )}
      <span className="font-medium uppercase tracking-wide">
        {state === 'listening' ? 'Dictating' : state === 'paused' ? 'Paused' : ''}
      </span>
      {interimText && (
        <span className="truncate text-on-surface-variant" aria-live="polite">
          {interimText}
        </span>
      )}
    </div>
  )
}

/**
 * Command-not-recognized feedback (Task 3.9): brief, low-friction inline
 * indicator — never a blocking modal, never silent.
 */
export function CommandNotRecognized({ heard }: { heard: string }) {
  return (
    <p role="status" data-status="command-not-recognized" className="font-ui text-xs text-creative-spark-amber">
      Didn’t catch that as a command — repeat after “Partner”, or rephrase. Heard: “{heard}”
    </p>
  )
}
