import { useEffect, useRef, useState } from 'react'

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
    <section
      aria-label="Story bible"
      className="mx-auto w-full max-w-[720px] rounded-lg border border-slate-800 bg-container p-6"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-ui text-base font-medium text-on-surface">Season Story Bible</h2>
        {status === 'ready' && (
          <p aria-live="polite" className="font-ui text-xs text-on-surface-variant">
            {SAVE_LABEL[saveState]}
          </p>
        )}
      </header>

      {status === 'loading' && (
        <p role="status" className="font-ui text-sm text-on-surface-variant">
          Loading story bible…
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="font-ui text-sm text-error">
          Couldn’t load this story bible. Check your connection and try again.
        </p>
      )}

      {status === 'ready' && (
        <textarea
          aria-label="Story bible content"
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Season arcs, character through-lines, world rules, running gags, promises made to the audience…"
          rows={14}
          className={cnBibleTextarea()}
        />
      )}
    </section>
  )
}

function cnBibleTextarea(): string {
  return [
    'w-full resize-y rounded-md border border-outline-variant bg-container-low',
    'p-4 font-ui text-[15px] leading-relaxed text-on-surface placeholder:text-on-surface-variant/50',
    'outline-none focus:border-creative-spark-blue',
  ].join(' ')
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
