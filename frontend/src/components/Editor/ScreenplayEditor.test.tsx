import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ElementRenderer from './ElementRenderer'
import { ELEMENT_TYPE_LABELS } from './elementStyles'
import ScreenplayEditor from './ScreenplayEditor'
import { saveScriptElements, type ElementType, type ScriptElement } from '@/lib/api'

const elements: ScriptElement[] = [
  { id: 'e1', position: 0, type: 'scene_heading', content: 'Int. Dispatch - Night' },
  { id: 'e2', position: 1, type: 'action', content: 'Rain hammers the windows.' },
  { id: 'e3', position: 2, type: 'character', content: 'MARA' },
  { id: 'e4', position: 3, type: 'parenthetical', content: '(into radio)' },
  { id: 'e5', position: 4, type: 'dialogue', content: "Unit two, we're moving." },
  { id: 'e6', position: 5, type: 'transition', content: 'CUT TO:' },
]

const okLoader = vi.fn(async () => ({
  script: { id: 's1', project_id: 'p1', episode_id: null },
  elements,
}))

describe('ElementRenderer', () => {
  it.each(Object.entries(ELEMENT_TYPE_LABELS) as Array<[ElementType, string]>)(
    'labels %s elements as "%s" in the margin',
    (type, label) => {
      render(<ElementRenderer type={type} content="Sample text" />)
      const root = document.querySelector(`[data-element-type="${type}"]`)
      expect(root).not.toBeNull()
      expect(root?.textContent).toContain(label)
      expect(root?.textContent).toContain('Sample text')
    }
  )

  it('applies industry-standard indents per element type', () => {
    const cases: Array<[Parameters<typeof ElementRenderer>[0]['type'], RegExp]> = [
      ['character', /ml-\[2in\]/],
      ['dialogue', /ml-\[1in\]/],
      ['parenthetical', /ml-\[1\.5in\]/],
      ['scene_heading', /uppercase/],
    ]
    for (const [type, pattern] of cases) {
      const { container } = render(<ElementRenderer type={type} content="x" />)
      const paragraph = container.querySelector('p')
      expect(paragraph?.className).toMatch(pattern)
      // Cleanup between renders is handled by RTL auto-cleanup in vitest globals mode.
    }
  })

  it('renders scene headings uppercase via style while preserving written casing in the DOM', () => {
    render(<ElementRenderer type="scene_heading" content="int. room - day" />)
    const paragraph = document.querySelector('[data-element-type="scene_heading"] p')
    expect(paragraph?.className).toContain('uppercase')
    expect(paragraph?.textContent).toBe('int. room - day')
  })
})

describe('ScreenplayEditor keyboard editing', () => {
  // Tests that fail mid-way must not leak fake timers into siblings.
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const type = (textarea: HTMLTextAreaElement, value: string) => {
    fireEvent.change(textarea, { target: { value } })
  }

  const textareas = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]'))

  const renderReady = async (props: { scriptId: string; elements?: ScriptElement[]; saveElements?: typeof saveScriptElements }) => {
    const save = props.saveElements ?? (async () => {})
    const utils = render(
      <ScreenplayEditor
        scriptId={props.scriptId}
        loadScript={async () => ({
          script: {},
          elements: props.elements ?? [],
        })}
        saveElements={save}
      />
    )
    await vi.waitFor(() => {
      if ((props.elements?.length ?? 0) === 0) {
        if (screen.queryByText(/page is blank/i)) return
      } else if (textareas(utils.container).length >= (props.elements?.length ?? 0)) {
        return
      }
      throw new Error('editor not ready')
    })
    return { container: utils.container, save }
  }

  it.each([
    ['Enter after an action creates a character element', 'action', 'character'],
    ['Enter after a character creates dialogue', 'character', 'dialogue'],
    ['Enter after a dialogue returns to character', 'dialogue', 'character'],
    ['Enter after a transition starts the next scene', 'transition', 'scene_heading'],
  ] as Array<[string, ElementType, ElementType]>)('%s', async (_name, fromType, expectedType) => {
    vi.useFakeTimers()
    const { container } = await renderReady({
      scriptId: 'enter-test',
      elements: [{ id: 'e1', position: 0, type: fromType, content: 'Line.' }],
    })

    fireEvent.keyDown(textareas(container)[0]!, { key: 'Enter' })
    expect(textareas(container)).toHaveLength(2)
    expect(textareas(container)[1]?.getAttribute('aria-label')).toContain(ELEMENT_TYPE_LABELS[expectedType])
  })

  it('persists edited content via debounced full-replace with normalized order', async () => {
    vi.useFakeTimers()
    const save = vi.fn(async () => {})
    const { container } = render(
      <ScreenplayEditor
        scriptId="s9"
        loadScript={async () => ({
          script: {},
          elements,
        })}
        saveElements={save}
      />
    )
    await vi.waitFor(() => expect(textareas(container).length).toBe(6))

    type(textareas(container)[1]!, 'Thunder rattles the glass.')

    // Not saved immediately.
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(900)

    expect(save).toHaveBeenCalledWith('s9', [
      { type: 'scene_heading', content: 'Int. Dispatch - Night' },
      { type: 'action', content: 'Thunder rattles the glass.' },
      { type: 'character', content: 'MARA' },
      { type: 'parenthetical', content: '(into radio)' },
      { type: 'dialogue', content: "Unit two, we're moving." },
      { type: 'transition', content: 'CUT TO:' },
    ])
    vi.useRealTimers()
  })

  it('Backspace on an empty element removes it and refocuses the previous one', async () => {
    vi.useFakeTimers()
    const save = vi.fn(async () => {})
    const { container } = render(
      <ScreenplayEditor
        scriptId="s10"
        loadScript={async () => ({
          script: {},
          elements: [
            { id: 'a', position: 0, type: 'action', content: 'First line.' },
            { id: 'b', position: 1, type: 'action', content: '' },
          ],
        })}
        saveElements={save}
      />
    )
    await vi.waitFor(() => expect(textareas(container).length).toBe(2))

    const empty = textareas(container)[1]!
    empty.focus()
    fireEvent.keyDown(empty, { key: 'Backspace' })

    expect(textareas(container).length).toBe(1)
    expect(document.activeElement?.getAttribute('data-key')).toBe('a')

    await vi.advanceTimersByTimeAsync(900)
    expect(save).toHaveBeenCalledWith('s10', [{ type: 'action', content: 'First line.' }])
    vi.useRealTimers()
  })

  it('re-tags an element via the hover menu and persists the new type', async () => {
    vi.useFakeTimers()
    const save = vi.fn(async () => {})
    const { container } = render(
      <ScreenplayEditor
        scriptId="s11"
        loadScript={async () => ({
          script: {},
          elements: [{ id: 'only', position: 0, type: 'action', content: 'MARA' }],
        })}
        saveElements={save}
      />
    )
    await vi.waitFor(() => expect(textareas(container).length).toBe(1))

    // The block exposes its data-element-type; the re-tag menu targets CHAR.
    const block = container.querySelector('[data-element-type="action"]')!
    const charButton = Array.from(block.querySelectorAll('menu button')).find(
      (b) => b.getAttribute('title') === 'CHAR'
    )!
    fireEvent.click(charButton)

    expect(block.getAttribute('data-element-type')).toBe('character')

    await vi.advanceTimersByTimeAsync(900)
    expect(save).toHaveBeenCalledWith('s11', [{ type: 'character', content: 'MARA' }])
    vi.useRealTimers()
  })

  it('surfaces save failures without losing local edits', async () => {
    vi.useFakeTimers()
    let shouldFail = true
    const save = vi.fn(async () => {
      if (shouldFail) throw new Error('offline')
    })
    const { container } = render(
      <ScreenplayEditor
        scriptId="s12"
        loadScript={async () => ({ script: {}, elements: [{ id: 'x', position: 0, type: 'action', content: '' }] })}
        saveElements={save}
      />
    )
    await vi.waitFor(() => expect(textareas(container).length).toBe(1))

    type(textareas(container)[0]!, 'Precious words.')
    vi.advanceTimersByTime(900)
    await vi.waitFor(() => expect(screen.getByText(/Save failed/i)).toBeInTheDocument())

    // Next edit retries.
    shouldFail = false
    type(textareas(container)[0]!, 'Precious words, kept safe.')
    vi.advanceTimersByTime(900)
    await vi.waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
    expect(save).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('ScreenplayEditor', () => {
  it('renders all structured elements in order on the paper sheet', async () => {
    render(<ScreenplayEditor scriptId="s1" loadScript={okLoader} />)

    await waitFor(() => expect(okLoader).toHaveBeenCalledWith('s1'))
    await waitFor(() => expect(screen.getByText(/Rain hammers the windows/)).toBeInTheDocument())

    const sheet = screen.getByLabelText('Screenplay')
    expect(sheet.className).toContain('bg-paper-white')
    expect(sheet.className).toContain('max-w-[850px]')
    // Soft large-radius shadow for the editor sheet; corners stay sharp.
    expect(sheet.className).toContain('shadow-[0_10px_30px_rgba(0,0,0,0.2)]')

    const ordered = Array.from(sheet.querySelectorAll('[data-element-type]')).map((el) =>
      el.getAttribute('data-element-type')
    )
    expect(ordered).toEqual(['scene_heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition'])
  })

  it('shows an empty-page state for a script with no elements', async () => {
    const emptyLoader = vi.fn(async () => ({
      script: { id: 's2', project_id: 'p1', episode_id: null },
      elements: [],
    }))
    render(<ScreenplayEditor scriptId="s2" loadScript={emptyLoader} />)
    await waitFor(() => expect(screen.getByText(/page is blank/i)).toBeInTheDocument())
  })

  it('distinguishes auth failures from other errors', async () => {
    const unauthorized = Object.assign(new Error('401'), { status: 401 })
    const failingLoader = vi.fn(async () => {
      throw unauthorized
    })
    render(<ScreenplayEditor scriptId="s3" loadScript={failingLoader} />)
    await waitFor(() => expect(screen.getByText(/signed out/i)).toBeInTheDocument())

    const serverError = Object.assign(new Error('500'), { status: 500 })
    const errorLoader = vi.fn(async () => {
      throw serverError
    })
    render(<ScreenplayEditor scriptId="s4" loadScript={errorLoader} />)
    await waitFor(() => expect(screen.getByText(/couldn’t load/i)).toBeInTheDocument())
  })

  it('shows a loading state before data arrives and never renders stale script content after switching scripts', async () => {
    const resolvers: Record<string, (value: { script: { id: string; project_id: string; episode_id: null }; elements: ScriptElement[] }) => void> = {}
    const keyedLoader = vi.fn((scriptId: string) => {
      return new Promise<{ script: { id: string; project_id: string; episode_id: null }; elements: ScriptElement[] }>((resolve) => {
        resolvers[scriptId] = resolve
      })
    })
    const { rerender } = render(<ScreenplayEditor scriptId="s-a" loadScript={keyedLoader} />)
    rerender(<ScreenplayEditor scriptId="s-b" loadScript={keyedLoader} />)

    // The stale s-a load resolves after the switch; its result must be discarded.
    resolvers['s-a']({ script: { id: 's-a', project_id: 'p1', episode_id: null }, elements })

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    expect(screen.queryByText(/Rain hammers the windows/)).not.toBeInTheDocument()

    // The current script's data still lands.
    resolvers['s-b']({ script: { id: 's-b', project_id: 'p1', episode_id: null }, elements: [elements[0]!] })
    await waitFor(() => expect(screen.getByText(/Int\. Dispatch - Night/i)).toBeInTheDocument())
  })
})
