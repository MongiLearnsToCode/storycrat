import { useCallback, useEffect, useRef, useState } from 'react'
import type { ElementType, ScriptElement } from '@/lib/api'
import { NEXT_TYPE } from './elementStyles'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface LocalElement {
  /** Stable client-side key; server IDs are reassigned on each full save. */
  key: string
  type: ElementType
  content: string
}

function toLocal(elements: ScriptElement[]): LocalElement[] {
  return elements.map((el) => ({ key: el.id, type: el.type, content: el.content }))
}

let keyCounter = 0
function freshKey(): string {
  keyCounter += 1
  return `local-${keyCounter}-${crypto.randomUUID()}`
}

const SAVE_DEBOUNCE_MS = 800

/**
 * Owns the element list for the editor plus debounced full-replace
 * persistence (Task 2.4). All mutations produce a normalized order — the
 * array is always the source of truth for positions.
 */
export function useScriptElements(scriptId: string, initial: ScriptElement[], save: (scriptId: string, elements: Array<{ type: ElementType; content: string }>) => Promise<void>) {
  const [elements, setElements] = useState<LocalElement[]>(() => toLocal(initial))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Latest values for the pending debounce callback without re-arming it.
  const latest = useRef(elements)
  latest.current = elements

  const persist = useCallback(async () => {
    setSaveState('saving')
    try {
      await save(
        scriptId,
        latest.current.map((el) => ({ type: el.type, content: el.content }))
      )
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [scriptId, save])

  const scheduleSave = useCallback(() => {
    setSaveState('dirty')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void persist(), SAVE_DEBOUNCE_MS)
  }, [persist])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const updateContent = useCallback((key: string, content: string) => {
    setElements((prev) => prev.map((el) => (el.key === key ? { ...el, content } : el)))
    scheduleSave()
  }, [scheduleSave])

  const retag = useCallback((key: string, type: ElementType) => {
    setElements((prev) => prev.map((el) => (el.key === key ? { ...el, type } : el)))
    scheduleSave()
  }, [scheduleSave])

  /** Inserts an element after `afterKey` (or at the end when omitted). Returns the new key for focus management. */
  const insertAfter = useCallback(
    (afterKey: string | null, type?: ElementType): string => {
      const source = afterKey === null ? latest.current[latest.current.length - 1] : latest.current.find((el) => el.key === afterKey)
      const newType = type ?? (source ? NEXT_TYPE[source.type] : 'scene_heading')
      const newEl: LocalElement = { key: freshKey(), type: newType, content: '' }
      setElements((prev) => {
        if (afterKey === null) return [...prev, newEl]
        const idx = prev.findIndex((el) => el.key === afterKey)
        if (idx === -1) return [...prev, newEl]
        return [...prev.slice(0, idx + 1), newEl, ...prev.slice(idx + 1)]
      })
      scheduleSave()
      return newEl.key
    },
    [scheduleSave]
  )

  /** Deletes an element. Keyboard path only fires on empty elements; the toolbar delete works on any element. */
  const removeElement = useCallback(
    (key: string): string | null => {
      const current = latest.current
      const idx = current.findIndex((el) => el.key === key)
      if (idx === -1) return null
      const previousKey = idx > 0 ? current[idx - 1]?.key ?? null : null
      setElements((prev) => prev.filter((el) => el.key !== key))
      scheduleSave()
      return previousKey
    },
    [scheduleSave]
  )

  return { elements, saveState, updateContent, retag, insertAfter, removeElement }
}
