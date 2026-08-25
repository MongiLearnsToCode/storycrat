import { useState } from 'react'
import { requestNotes, type Citation } from '@/lib/api'
import ScriptChip from './ScriptChip'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

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
    <Card role="region" aria-label="Get notes" className="gap-0 bg-container py-4">
      <CardContent className="px-4">
      {state === 'idle' && (
        <Button
          type="button"
          onClick={() => void run()}
          className="w-full"
        >
          ✦ Get Notes
        </Button>
      )}

      {state === 'loading' && (
        <div role="status" aria-label="Reading your script and taking notes" className="space-y-2">
          <Skeleton className="h-4 w-48 bg-creative-spark-blue/20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      )}

      {state === 'error' && (
        <Alert variant="warning">
          <AlertDescription>
            Notes are unavailable right now — try again shortly.
            <Button type="button" variant="link" size="xs" onClick={() => void run()} className="px-0">Retry</Button>
          </AlertDescription>
        </Alert>
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
          <Separator />
          <span className="block pt-2">
            <Button
              type="button"
              onClick={onContinueInConversation}
              variant="link"
              size="xs"
              className="px-0 text-on-surface-variant hover:text-on-surface"
            >
              Continue in Conversation
            </Button>
          </span>
        </article>
      )}
      </CardContent>
    </Card>
  )
}
