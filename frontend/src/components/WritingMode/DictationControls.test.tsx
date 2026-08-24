import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import DictationControls from './DictationControls'
import type { DictationClient, DictationState } from '@/lib/stt-client'

function makeClient(state: DictationState): DictationClient {
  return {
    state,
    start: vi.fn(async () => {}),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    undo: vi.fn(),
  } as unknown as DictationClient
}

describe('DictationControls (Task 3.2)', () => {
  it('idle shows only Start', () => {
    const client = makeClient('idle')
    const onStart = vi.fn()
    render(<DictationControls scriptId="s1" client={client} setClient={() => {}} onStart={onStart} />)

    fireEvent.click(screen.getByTestId('start-dictation'))
    expect(onStart).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('pause')).toBeNull()
  })

  it('listening offers Pause and Stop', () => {
    const client = makeClient('listening')
    render(<DictationControls scriptId="s1" client={client} setClient={() => {}} />)

    fireEvent.click(screen.getByTestId('pause'))
    expect(client.pause).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByTestId('stop'))
    expect(client.stop).toHaveBeenCalledOnce()
  })

  it('paused offers Resume (and still allows Stop)', () => {
    const client = makeClient('paused')
    render(<DictationControls scriptId="s1" client={client} setClient={() => {}} />)

    fireEvent.click(screen.getByTestId('resume'))
    expect(client.resume).toHaveBeenCalledOnce()
    // Stopping remains possible from a pause.
    expect(screen.getByTestId('stop')).toBeInTheDocument()
  })

  it('shows Undo only when a destructive command is undoable', () => {
    const client = makeClient('listening')
    const { rerender } = render(
      <DictationControls scriptId="s1" client={client} setClient={() => {}} />
    )
    expect(screen.queryByTestId('undo-button')).toBeNull()

    rerender(<DictationControls scriptId="s1" client={client} setClient={() => {}} undoAvailable />)
    fireEvent.click(screen.getByTestId('undo-button'))
    expect(client.undo).toHaveBeenCalledOnce()
  })
})
