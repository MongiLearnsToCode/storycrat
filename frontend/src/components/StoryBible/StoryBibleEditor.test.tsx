import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StoryBibleEditor from './StoryBibleEditor'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('StoryBibleEditor', () => {
  it('loads and shows existing bible content', async () => {
    const load = vi.fn(async () => ({ content: 'Season arc: the precinct closes by EP.6.' }))
    render(<StoryBibleEditor seasonId="s1" load={load} />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    await waitFor(() => {
      const textarea = screen.getByLabelText(/story bible content/i) as HTMLTextAreaElement
      expect(textarea.value).toContain('EP.6')
    })
    expect(load).toHaveBeenCalledWith('s1')
  })

  it('autosaves edits with debounce and reports Saved', async () => {
    vi.useFakeTimers()
    const save = vi.fn(async () => {})
    render(<StoryBibleEditor seasonId="s2" load={async () => ({ content: '' })} save={save} />)
    const textarea = await vi.waitFor(() => screen.getByLabelText(/story bible content/i))

    fireEvent.change(textarea, { target: { value: 'Rule: no phones in Act One.' } })
    expect(screen.getByText(/editing/i)).toBeInTheDocument()

    // Not saved before the debounce elapses.
    vi.advanceTimersByTime(500)
    expect(save).not.toHaveBeenCalled()

    vi.advanceTimersByTime(400)
    await vi.waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
    expect(save).toHaveBeenCalledWith('s2', 'Rule: no phones in Act One.')
  })

  it('surfaces save failure without losing the local text', async () => {
    vi.useFakeTimers()
    let shouldFail = true
    const save = vi.fn(async () => {
      if (shouldFail) throw new Error('offline')
    })
    render(<StoryBibleEditor seasonId="s3" load={async () => ({ content: 'keep me' })} save={save} />)
    const textarea = await vi.waitFor(() => screen.getByLabelText(/story bible content/i))

    fireEvent.change(textarea, { target: { value: 'keep me — plus this' } })
    vi.advanceTimersByTime(900)
    await vi.waitFor(() => expect(screen.getByText(/save failed/i)).toBeInTheDocument())
    expect(textarea).toHaveValue('keep me — plus this')

    shouldFail = false
    fireEvent.change(textarea, { target: { value: 'keep me — plus this, fixed' } })
    vi.advanceTimersByTime(900)
    await vi.waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
  })

  it('distinguishes load errors', async () => {
    const load = vi.fn(async () => {
      throw new Error('500')
    })
    render(<StoryBibleEditor seasonId="s4" load={load} />)
    await waitFor(() => expect(screen.getByText(/couldn’t load this story bible/i)).toBeInTheDocument())
  })
})
