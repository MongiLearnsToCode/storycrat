import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Inline AI suggestion chip (Task 3.11, PRD Req 19).
 * The suggestion NEVER enters the document on its own — only "Use it" writes
 * (via the caller's callback); "Dismiss" throws it away. AI presence styling:
 * creative-spark-blue border and a subtle glow while loading.
 */
export interface SuggestionChipProps {
  onRequest: () => Promise<string>
  onAccept: (suggestion: string) => void
  onDismiss?: () => void
}

export default function SuggestionChip({ onRequest, onAccept, onDismiss }: SuggestionChipProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'shown'>('idle')
  const [suggestion, setSuggestion] = useState('')
  const [error, setError] = useState(false)

  const request = async () => {
    setState('loading')
    try {
      const result = await onRequest()
      setSuggestion(result)
      setState('shown')
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3000)
      setState('idle')
    }
  }

  return (
    <div data-testid="suggestion-chip" className="mt-1">
      <Button
        type="button"
        variant="link"
        size="xs"
        onClick={() => void request()}
        disabled={state === 'loading'}
        title="Ask for a one-line alternative"
        className={cn(
          'h-auto px-0 font-ui text-[11px] text-creative-spark-blue',
          state === 'loading' && 'animate-pulse',
          error && 'text-error'
        )}
      >
        {error ? 'Unavailable' : state === 'loading' ? 'Thinking…' : '✦ Suggest'}
      </Button>

      {state === 'shown' && (
        <Card className="mt-1 gap-0 border-creative-spark-blue/60 bg-creative-spark-blue/5 py-2 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
          <CardContent className="flex items-start gap-2 px-3">
          <p className="flex-1 font-script text-base leading-relaxed text-neutral-900">{suggestion}</p>
          <span className="flex shrink-0 gap-2 font-ui text-xs">
            <Button
              type="button"
              size="xs"
              data-testid="accept-suggestion"
              onClick={() => {
                onAccept(suggestion)
                setState('idle')
              }}
            >
              Use it
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              data-testid="dismiss-suggestion"
              onClick={() => {
                setState('idle')
                onDismiss?.()
              }}
            >
              Dismiss
            </Button>
          </span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
