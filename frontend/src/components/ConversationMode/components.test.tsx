import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ScriptChip from './ScriptChip'
import ChatPanel from './ChatPanel'
import QuickNotesPanel from './QuickNotesPanel'
import type { Citation } from '@/lib/api'

const crossEpisodeCitation: Citation = { label: 'SC.3', episodeId: 'ep-2', scriptId: 'sc-2', sceneIndex: 2 }
const sameEpisodeCitation: Citation = { label: 'SC.1', episodeId: 'ep-1', scriptId: 'sc-1', sceneIndex: 0 }
const featureCitation: Citation = { label: 'SC.4', episodeId: null, scriptId: 'sc-f', sceneIndex: 3 }

describe('ScriptChip (Task 4.10)', () => {
  it('tags citations from other episodes with an EP prefix', () => {
    render(<ScriptChip citation={crossEpisodeCitation} currentEpisodeId="ep-1" />)
    const chip = screen.getByTestId('script-chip')
    expect(chip.textContent).toContain('EP.2')
    expect(chip.textContent).toContain('SC.3')
  })

  it('does not tag the currently open episode', () => {
    render(<ScriptChip citation={sameEpisodeCitation} currentEpisodeId="ep-1" />)
    expect(screen.getByTestId('script-chip').textContent).not.toMatch(/EP\./)
  })

  it('feature citations carry no episode tag', () => {
    render(<ScriptChip citation={featureCitation} />)
    expect(screen.getByTestId('script-chip').textContent).not.toMatch(/EP\./)
  })
})

describe('ChatPanel (Tasks 4.1/4.4/4.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const makeSender = () =>
    vi.fn(async () => ({
      conversationId: 'conv-1',
      reply: {
        role: 'assistant' as const,
        content: 'The stakes in SC.2 never escalate past the threat.',
        citations: [crossEpisodeCitation],
      },
    }))

  it('sends a message, renders the grounded reply with chips, keeps history', async () => {
    const sendMessage = makeSender()
    render(<ChatPanel projectId="p1" episodeId="ep-1" currentEpisodeId="ep-1" sendMessage={sendMessage} />)

    const input = screen.getByLabelText('Message')
    fireEvent.change(input, { target: { value: 'Are my stakes working?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith('p1', { question: 'Are my stakes working?', episodeId: 'ep-1', conversationId: undefined }))
    await waitFor(() => expect(screen.getByText(/stakes in SC\.2 never escalate/i)).toBeInTheDocument())

    // Both turns remain visible (scroll-back).
    expect(screen.getByText('Are my stakes working?')).toBeInTheDocument()
    // Grounded reply is visually distinct (6.5) + chip present (4.10).
    const grounded = screen.getByText(/stakes in SC\.2 never escalate/i).closest('[data-grounded]')
    expect(grounded?.getAttribute('data-grounded')).toBe('true')
    expect(grounded?.textContent).toContain('Grounded in your script')
    const chip = screen.getByTestId('script-chip')
    expect(chip.textContent).toContain('EP.2')
  })

  it('subsequent sends reuse the conversation id for scroll-back continuity', async () => {
    const sendMessage = makeSender()
    render(<ChatPanel projectId="p1" sendMessage={sendMessage} />)
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'first' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'second' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(sendMessage).toHaveBeenLastCalledWith('p1', { question: 'second', conversationId: 'conv-1' }))
  })

  it('TTS toggle flips and speaks replies only when enabled', async () => {
    const speakSpy = vi.fn()
    const cancelSpy = vi.fn()
    ;(window as unknown as Record<string, unknown>).speechSynthesis = {
      speak: speakSpy,
      cancel: cancelSpy,
    }
    ;(window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = function (this: { text: string }, text: string) {
      this.text = text
    }

    render(<ChatPanel projectId="p1" sendMessage={makeSender()} />)
    expect((screen.getByRole('switch').getAttribute('aria-checked'))).toBe('false')

    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'talk to me' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(speakSpy).toHaveBeenCalledOnce())
  })
})

describe('QuickNotesPanel (Task 4.11)', () => {
  it('requests notes once and renders them as a static report with secondary continue action', async () => {
    const requestNotesFn = vi.fn(async () => ({ notes: 'NOTES: 1) escalation…', citations: [sameEpisodeCitation] }))
    const onContinue = vi.fn()
    render(<QuickNotesPanel projectId="p1" requestNotesFn={requestNotesFn} onContinueInConversation={onContinue} />)

    fireEvent.click(screen.getByRole('button', { name: /get notes/i }))
    await waitFor(() => expect(screen.getByTestId('notes-report')).toBeInTheDocument())
    expect(requestNotesFn).toHaveBeenCalledOnce()
    expect(screen.getByText(/NOTES: 1\)/)).toBeInTheDocument()

    // No reply affordance — just the clearly-secondary continue action.
    const continueBtn = screen.getByRole('button', { name: /continue in conversation/i })
    fireEvent.click(continueBtn)
    expect(onContinue).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /^reply$/i })).toBeNull()
  })

  it('surfaces unavailability with a retry instead of a dead end', async () => {
    const requestNotesFn = vi.fn(async () => {
      throw new Error('503')
    })
    render(<QuickNotesPanel projectId="p1" requestNotesFn={requestNotesFn} />)

    fireEvent.click(screen.getByRole('button', { name: /get notes/i }))
    await waitFor(() => expect(screen.getByText(/unavailable right now/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
