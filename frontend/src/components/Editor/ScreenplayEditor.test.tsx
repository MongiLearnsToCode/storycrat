import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ElementRenderer, { ELEMENT_TYPE_LABELS } from './ElementRenderer'
import ScreenplayEditor from './ScreenplayEditor'
import type { ScriptElement } from '@/lib/api'

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
  it.each(Object.entries(ELEMENT_TYPE_LABELS) as Array<[keyof typeof ELEMENT_TYPE_LABELS, string]>)(
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
