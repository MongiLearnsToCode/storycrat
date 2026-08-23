import { useCallback, useEffect, useRef, useState } from 'react'
import { ELEMENT_STYLES, ELEMENT_TYPE_LABELS } from './elementStyles'
import { useScriptElements, type SaveState } from './useScriptElements'
import { fetchScript, saveScriptElements, type ScriptElement } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * The screenplay editor (Tasks 2.3 + 2.4): renders structured elements on
 * the "paper" sheet and provides keyboard editing — inline content edits,
 * Enter to continue in screenplay flow, Backspace on an empty element to
 * remove it, and hover re-tagging. Persistence is debounced full-replace.
 */

export interface ScreenplayEditorProps {
  scriptId: string
  loadScript?: (scriptId: string) => Promise<{ script: unknown; elements: ScriptElement[] }>
  saveElements?: typeof saveScriptElements
}

export type EditorStatus = 'loading' | 'ready' | 'error' | 'unauthorized'

const SAVE_LABEL: Record<SaveState, string> = {
  idle: '',
  dirty: 'Editing…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed — retrying on next edit',
}

interface AutosizeTextareaProps {
  value: string
  onChange: (value: string) => void
  className: string
  ariaLabel?: string
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  dataKey: string
  focusRef?: React.RefObject<HTMLTextAreaElement | null>
}

function AutosizeTextarea({ value, onChange, className, ariaLabel, onKeyDown, dataKey, focusRef }: AutosizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  const resize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    if (ref.current) resize(ref.current)
  }, [value, resize])

  const setRefs = (el: HTMLTextAreaElement | null) => {
    ref.current = el
    if (focusRef) focusRef.current = el
    if (el) resize(el)
  }

  return (
    <textarea
      ref={setRefs}
      data-key={dataKey}
      rows={1}
      wrap="soft"
      aria-label={ariaLabel}
      className={cn(
        'w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none focus:underline decoration-creative-spark-blue/60',
        className
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}

export default function ScreenplayEditor({ scriptId, loadScript, saveElements }: ScreenplayEditorProps) {
  const loader = loadScript ?? fetchScript
  const saver = saveElements ?? saveScriptElements
  const [status, setStatus] = useState<EditorStatus>('loading')
  const [initialElements, setInitialElements] = useState<ScriptElement[]>([])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    loader(scriptId)
      .then((result) => {
        if (cancelled) return
        const sorted = [...result.elements].sort((a, b) => a.position - b.position)
        setInitialElements(sorted)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const errStatus = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0
        setStatus(errStatus === 401 ? 'unauthorized' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [scriptId, loader])

  return (
    <div className="flex justify-center px-4 py-8">
      {status === 'loading' && (
        <article aria-label="Screenplay" className="w-full max-w-[850px] rounded-sm bg-paper-white px-12 py-16 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <p role="status" className="font-ui text-sm text-neutral-500">
            Loading screenplay…
          </p>
        </article>
      )}
      {status === 'error' && (
        <article aria-label="Screenplay" className="w-full max-w-[850px] rounded-sm bg-paper-white px-12 py-16 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <p role="alert" className="font-ui text-sm text-red-700">
            Couldn’t load this screenplay. Check your connection and try again.
          </p>
        </article>
      )}
      {status === 'unauthorized' && (
        <article aria-label="Screenplay" className="w-full max-w-[850px] rounded-sm bg-paper-white px-12 py-16 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <p role="alert" className="font-ui text-sm text-red-700">
            You’re signed out. Sign in to open this screenplay.
          </p>
        </article>
      )}
      {/* Keyed by scriptId: switching scripts remounts the sheet with fresh state. */}
      {status === 'ready' && (
        <EditableSheet key={scriptId} scriptId={scriptId} initialElements={initialElements} save={saver} />
      )}
    </div>
  )
}

function EditableSheet({
  scriptId,
  initialElements,
  save,
}: {
  scriptId: string
  initialElements: ScriptElement[]
  save: typeof saveScriptElements
}) {
  const editor = useScriptElements(scriptId, initialElements, save)
  const pendingFocus = useRef<string | null>(null)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>, key: string): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      pendingFocus.current = editor.insertAfter(key)
      return
    }
    if (event.key === 'Backspace') {
      const target = event.currentTarget
      if (target.value.length === 0 && editor.elements.length > 1) {
        event.preventDefault()
        const previousKey = editor.removeElement(key)
        pendingFocus.current = previousKey
      }
    }
  }

  useEffect(() => {
    if (pendingFocus.current) {
      const el = document.querySelector<HTMLTextAreaElement>(`textarea[data-key="${pendingFocus.current}"]`)
      el?.focus()
      pendingFocus.current = null
    }
  }, [editor.elements])

  return (
    <article
      aria-label="Screenplay"
      className="relative w-full max-w-[850px] rounded-sm bg-paper-white px-12 py-16 shadow-[0_10px_30px_rgba(0,0,0,0.2)] sm:px-[1.5in]"
    >
      <p aria-live="polite" className="absolute top-3 right-4 font-ui text-xs text-neutral-400">
        {SAVE_LABEL[editor.saveState]}
      </p>

      {editor.elements.length === 0 ? (
        <div>
          <p className="font-script text-base leading-relaxed text-neutral-400">This page is blank.</p>
          <button
            type="button"
            onClick={() => editor.insertAfter(null)}
            className="mt-2 font-ui text-sm text-creative-spark-blue underline underline-offset-2"
          >
            Start the first scene heading
          </button>
        </div>
      ) : (
        editor.elements.map((element) => (
          <div key={element.key} data-element-type={element.type} className="group relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 -left-16 -translate-y-1/2 text-xs font-ui text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {ELEMENT_TYPE_LABELS[element.type]}
            </span>
            {/* Re-tag menu — single-action correction path for misclassified elements. */}
            <menu className="absolute top-1/2 right-0 hidden -translate-y-1/2 gap-1 group-hover:flex" aria-label={`Change element type (${ELEMENT_TYPE_LABELS[element.type]})`}>
              {(Object.keys(ELEMENT_STYLES) as Array<keyof typeof ELEMENT_STYLES>).map((type) => (
                <button
                  key={type}
                  type="button"
                  title={ELEMENT_TYPE_LABELS[type]}
                  disabled={type === element.type}
                  onClick={() => editor.retag(element.key, type)}
                  className={cn(
                    'rounded px-1.5 py-0.5 font-ui text-[11px]',
                    type === element.type ? 'text-neutral-300' : 'text-neutral-500 hover:bg-neutral-100 hover:text-creative-spark-blue'
                  )}
                >
                  {ELEMENT_TYPE_LABELS[type]}
                </button>
              ))}
            </menu>
            <AutosizeTextarea
              value={element.content}
              onChange={(value) => editor.updateContent(element.key, value)}
              onKeyDown={(event) => handleKeyDown(event, element.key)}
              ariaLabel={`${ELEMENT_TYPE_LABELS[element.type]} element`}
              dataKey={element.key}
              className={cn('font-script text-base leading-relaxed text-neutral-900', ELEMENT_STYLES[element.type])}
            />
          </div>
        ))
      )}
    </article>
  )
}
