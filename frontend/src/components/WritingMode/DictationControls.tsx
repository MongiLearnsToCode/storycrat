import type { DictationClient } from '@/lib/stt-client'
import { Button } from '@/components/ui/button'

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

export default function DictationControls({ client, onStart, undoAvailable = false, scriptId: _scriptId }: DictationControlsProps & { scriptId?: string }) {
  void _scriptId
  const handleStart = () => {
    onStart?.()
  }

  return (
    <div className="flex items-center gap-2" data-dictation-state={client.state}>
      {(client.state === 'idle' || client.state === 'stopped') && (
        <Button
          type="button"
          size="sm"
          data-testid="start-dictation"
          onClick={handleStart}
        >
          🎙 Start dictation
        </Button>
      )}

      {client.state === 'listening' && (
        <Button type="button" variant="outline" size="sm" data-testid="pause" onClick={() => client.pause()}>
          ⏸ Pause
        </Button>
      )}

      {client.state === 'paused' && (
        <Button type="button" variant="outline" size="sm" data-testid="resume" onClick={() => client.resume()}>
          ▶ Resume
        </Button>
      )}

      {(client.state === 'listening' || client.state === 'paused') && (
        <Button type="button" variant="outline" size="sm" data-testid="stop" onClick={() => client.stop()} className="border-recording-red/60 hover:bg-recording-red/10">
          ■ Stop
        </Button>
      )}

      {undoAvailable && (
        <Button type="button" variant="outline" size="sm" onClick={() => client.undo()} data-testid="undo-button" className="border-creative-spark-amber/60 hover:bg-creative-spark-amber/10">
          ↩ Undo delete
        </Button>
      )}
    </div>
  )
}
