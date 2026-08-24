import { cn } from '@/lib/utils'
import type { DictationClient } from '@/lib/stt-client'

/**
 * Microphone capture controls (Task 3.2) + undo affordance for destructive
 * voice commands (Task 3.8). The component owns no audio logic — the
 * DictationClient handles capture/relay; this renders its state and maps
 * clicks to pause/resume/stop/undo.
 */
export interface DictationControlsProps {
  scriptId: string
  client: DictationClient
  setClient: (client: DictationClient) => void
  onStart?: () => void
  undoAvailable?: boolean
}

const buttonBase =
  'rounded px-3 py-1.5 font-ui text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-creative-spark-blue'

export default function DictationControls({ client, onStart, undoAvailable = false, scriptId: _scriptId }: DictationControlsProps & { scriptId?: string }) {
  void _scriptId
  const handleStart = () => {
    onStart?.()
  }

  return (
    <div className="flex items-center gap-2" data-dictation-state={client.state}>
      {(client.state === 'idle' || client.state === 'stopped') && (
        <button
          type="button"
          data-testid="start-dictation"
          onClick={handleStart}
          className={cn(buttonBase, 'bg-midnight-charcoal border border-creative-spark-blue text-on-surface')}
        >
          🎙 Start dictation
        </button>
      )}

      {client.state === 'listening' && (
        <button type="button" data-testid="pause" onClick={() => client.pause()} className={cn(buttonBase, 'border border-outline-variant text-on-surface hover:border-outline')}>
          ⏸ Pause
        </button>
      )}

      {client.state === 'paused' && (
        <button type="button" data-testid="resume" onClick={() => client.resume()} className={cn(buttonBase, 'border border-outline-variant text-on-surface hover:border-outline')}>
          ▶ Resume
        </button>
      )}

      {(client.state === 'listening' || client.state === 'paused') && (
        <button type="button" data-testid="stop" onClick={() => client.stop()} className={cn(buttonBase, 'border border-recording-red/60 text-on-surface hover:bg-recording-red/10')}>
          ■ Stop
        </button>
      )}

      {undoAvailable && (
        <button type="button" onClick={() => client.undo()} data-testid="undo-button" className={cn(buttonBase, 'border border-creative-spark-amber/60 text-on-surface hover:bg-creative-spark-amber/10')}>
          ↩ Undo delete
        </button>
      )}
    </div>
  )
}
