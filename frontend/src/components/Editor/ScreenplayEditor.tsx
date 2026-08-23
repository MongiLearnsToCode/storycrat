import { useEffect, useState } from 'react'
import ElementRenderer from './ElementRenderer'
import { fetchScript, type ScriptElement, type Script } from '@/lib/api'

/**
 * The screenplay editor page (Task 2.3): renders structured script elements
 * on the "paper" sheet — 850px max-width centered, paper-white surface,
 * sharp corners, soft large-radius shadow (DESIGN.md → Elevation).
 *
 * Editing interactions land in Task 2.4; this component owns data loading
 * and the rendering contract everything else builds on.
 */
export type EditorStatus = 'loading' | 'ready' | 'error' | 'unauthorized'

export interface ScreenplayEditorProps {
  scriptId: string
  /** Injection seam for tests; production uses lib/api. */
  loadScript?: (scriptId: string) => Promise<{ script: Script; elements: ScriptElement[] }>
}

export default function ScreenplayEditor({ scriptId, loadScript }: ScreenplayEditorProps) {
  const loader = loadScript ?? fetchScript
  const [status, setStatus] = useState<EditorStatus>('loading')
  const [elements, setElements] = useState<ScriptElement[]>([])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    loader(scriptId)
      .then((result) => {
        if (cancelled) return
        const sorted = [...result.elements].sort((a, b) => a.position - b.position)
        setElements(sorted)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0
        setStatus(status === 401 ? 'unauthorized' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [scriptId, loader])

  return (
    <div className="flex justify-center px-4 py-8">
      <article
        aria-label="Screenplay"
        className="w-full max-w-[850px] rounded-sm bg-paper-white px-12 py-16 shadow-[0_10px_30px_rgba(0,0,0,0.2)] sm:px-[1.5in] py-[2in]"
      >
        {status === 'loading' && (
          <p role="status" className="font-ui text-sm text-neutral-500">
            Loading screenplay…
          </p>
        )}
        {status === 'error' && (
          <p role="alert" className="font-ui text-sm text-red-700">
            Couldn’t load this screenplay. Check your connection and try again.
          </p>
        )}
        {status === 'unauthorized' && (
          <p role="alert" className="font-ui text-sm text-red-700">
            You’re signed out. Sign in to open this screenplay.
          </p>
        )}
        {status === 'ready' &&
          (elements.length === 0 ? (
            <p className="font-script text-base leading-relaxed text-neutral-400">
              This page is blank. Start writing — or dictate — your first scene.
            </p>
          ) : (
            elements.map((element) => <ElementRenderer key={element.id} type={element.type} content={element.content} />)
          ))}
      </article>
    </div>
  )
}
