import { useState } from 'react'
import { requestNotes, type Citation } from '@/lib/api'
import ScriptChip from './ScriptChip'
import { cn } from '@/lib/utils'

/**
 * Get Notes (Task 4.11): a single-shot critique rendered as a written report
 * — no reply affordance, clearly secondary "Continue in Conversation" action
 * (DESIGN.md → AI Conversation → Get Notes panel).
 */
export interface QuickNotesPanelProps {
  projectId: string
  episodeId?: string
  currentEpisodeId?: string | null
  requestNotesFn?: typeof requestNotes
  onContinueInConversation?: () => void
}

export default function QuickNotesPanel({
  projectId,
  episodeId,
  currentEpisodeId = null,
  requestNotesFn = requestNotes,
  onContinueInConversation,
}: QuickNotesPanelProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [notes, setNotes] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])

  const run = async () => {
    setState('loading')
    try {
      const result = await requestNotesFn(projectId, episodeId)
      setNotes(result.notes)
      setCitations(result.citations ?? [])
      setState('ready')
    } catch {
      setState('error')
    }
  }

  return (
    <section aria-label="Get notes" className="rounded-lg border border-outline-variant bg-container p-4">
      {state === 'idle' && (
        <button
          type="button"
          onClick={() => void run()}
          className="w-full rounded-md border border-creative-spark-blue bg-midnight-charcoal px-3 py-2 font-ui text-sm font-medium text-on-surface"
        >
          ✦ Get Notes
        </button>
      )}

      {state === 'loading' && (
        <p role="status" className="animate-pulse font-ui text-sm text-creative-spark-blue">
          Reading your script and taking notes…
        </p>
      )}

      {state === 'error' && (
        <div>
          <p role="alert" className="font-ui text-sm text-error">
            Notes are unavailable right now — try again shortly.
          </p>
          <button type="button" onClick={() => void run()} className="mt-2 font-ui text-xs text-creative-spark-blue underline">
            Retry
          </button>
        </div>
      )}

      {state === 'ready' && (
        <article data-testid="notes-report" className={cn('space-y-3')}>
          <h3 className="font-ui text-[13px] font-medium uppercase tracking-wide text-on-surface-variant">Your notes</h3>
          <p className="whitespace-pre-wrap font-ui text-[15px] leading-relaxed text-on-surface">{notes}</p>
          {citations.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {citations.map((citation) => (
                <ScriptChip key={`${citation.scriptId}:${citation.sceneIndex}`} citation={citation} currentEpisodeId={currentEpisodeId} />
              ))}
            </span>
          )}
          <span className="block border-t border-outline-variant pt-2">
            <button
              type="button"
              onClick={onContinueInConversation}
              className="font-ui text-xs text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
            >
              Continue in Conversation
            </button>
          </span>
        </article>
      )}
    </section>
  )
}
