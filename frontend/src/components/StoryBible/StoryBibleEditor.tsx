import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

/**
 * Season-level story bible editor (Task 2.5).
 *
 * Deliberately NOT the paper sheet: the bible is the writer's working notes,
 * so it uses the midnight UI surface family with Geist typography
 * (DESIGN.md — application UI), keeping JetBrains Mono reserved for script
 * content only.
 */
export interface StoryBibleEditorProps {
  seasonId: string
  load?: (seasonId: string) => Promise<{ content: string }>
  save?: (seasonId: string, content: string) => Promise<void>
  /** Debounce window for autosave; exposed for tests. */
  saveDebounceMs?: number
}

export type BibleSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

const SAVE_LABEL: Record<BibleSaveState, string> = {
  idle: '',
  dirty: 'Editing…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed — retrying on next edit',
}

export default function StoryBibleEditor({ seasonId, load, save, saveDebounceMs = 800 }: StoryBibleEditorProps) {
  const loader = load ?? defaultLoad
  const saver = save ?? defaultSave

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [content, setContent] = useState('')
  const [saveState, setSaveState] = useState<BibleSaveState>('idle')
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const latestContent = useRef(content)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    loader(seasonId)
      .then((bible) => {
        if (cancelled) return
        setContent(bible.content)
        latestContent.current = bible.content
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [seasonId, loader])

  const persist = async () => {
    setSaveState('saving')
    try {
      await saver(seasonId, latestContent.current)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  const handleChange = (value: string) => {
    setContent(value)
    latestContent.current = value
    setSaveState('dirty')
    if (timer) clearTimeout(timer)
    const next = setTimeout(() => void persist(), saveDebounceMs)
    setTimer(next)
  }

  return (
    <Card
      role="region"
      aria-label="Story bible"
      className="mx-auto w-full max-w-[720px] bg-container"
    >
      <CardHeader className="grid-cols-[1fr_auto] items-baseline">
        <CardTitle className="font-ui text-base font-medium">Season Story Bible</CardTitle>
        {status === 'ready' && (
          <p aria-live="polite" className="font-ui text-xs text-on-surface-variant">
            {SAVE_LABEL[saveState]}
          </p>
        )}
      </CardHeader>

      <CardContent>
      {status === 'loading' && (
        <div role="status" aria-label="Loading story bible" className="space-y-3">
          <span className="sr-only">Loading story bible…</span>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>Couldn’t load this story bible. Check your connection and try again.</AlertDescription>
        </Alert>
      )}

      {status === 'ready' && (
        <Textarea
          aria-label="Story bible content"
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Season arcs, character through-lines, world rules, running gags, promises made to the audience…"
          rows={14}
          className="min-h-72 resize-y p-4 text-[15px] leading-relaxed"
        />
      )}
      </CardContent>
    </Card>
  )
}

async function defaultLoad(seasonId: string): Promise<{ content: string }> {
  const response = await fetch(`/api/seasons/${encodeURIComponent(seasonId)}/story-bible`)
  if (!response.ok) throw new Error(String(response.status))
  const body = (await response.json()) as { storyBible: { content: string } }
  return { content: body.storyBible.content }
}

async function defaultSave(seasonId: string, content: string): Promise<void> {
  const response = await fetch(`/api/seasons/${encodeURIComponent(seasonId)}/story-bible`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!response.ok) throw new Error(String(response.status))
}
