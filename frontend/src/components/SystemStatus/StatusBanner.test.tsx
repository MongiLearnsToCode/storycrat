import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommandNotRecognized, RecordingBar, StatusBanner } from './StatusBanner'

describe('StatusBanner (Task 3.12)', () => {
  it('mic-denied is a persistent banner naming the fix', () => {
    render(<StatusBanner status={{ kind: 'mic_denied' }} />)
    const el = screen.getByRole('alert')
    expect(el.getAttribute('data-status')).toBe('mic-denied')
    expect(el.textContent).toMatch(/microphone access is blocked/i)
  })

  it('reconnecting reads as transient with buffered-work reassurance', () => {
    render(<StatusBanner status={{ kind: 'reconnecting' }} />)
    const el = screen.getByRole('status')
    expect(el.getAttribute('data-status')).toBe('reconnecting')
    expect(el.textContent).toMatch(/reconnecting/i)
    expect(el.textContent).toMatch(/buffered/i)
  })

  it('rate-limit is visually and tonally distinct from errors', () => {
    render(<StatusBanner status={{ kind: 'rate_limited' }} />)
    const el = screen.getByText(/rate limit/i)
    // Amber accent, not the recording-red error family.
    const container = el.closest('[data-status]')!
    expect(container.getAttribute('data-status')).toBe('rate-limited')
    expect(container.className).toContain('creative-spark-amber')
    expect(container.className).not.toContain('recording-red/50')
    expect(container.textContent).toMatch(/try again in a moment/i)
  })

  it('renders nothing when healthy', () => {
    const { container } = render(<StatusBanner status={null} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('RecordingBar', () => {
  it('dictation state uses recording-red pulse', () => {
    const { container } = render(<RecordingBar state="listening" interimText="" />)
    expect(container.querySelector('[data-state="listening"]')!.className).toContain('bg-recording-red/15')
    expect(screen.getByText('Dictating')).toBeInTheDocument()
  })

  it('paused state shows without red', () => {
    const { container } = render(<RecordingBar state="paused" interimText="" />)
    expect(container.querySelector('[data-state="paused"]')!.className).toContain('bg-container')
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('shows interim dictated text for live feedback', () => {
    render(<RecordingBar state="listening" interimText="the phone rings" />)
    expect(screen.getByText('the phone rings')).toBeInTheDocument()
  })
})

describe('CommandNotRecognized (Task 3.9)', () => {
  it('is inline, non-blocking, echoes what was heard, and prompts retry', () => {
    render(<CommandNotRecognized heard="flurbish the scene" />)
    const el = screen.getByRole('status')
    expect(el.getAttribute('data-status')).toBe('command-not-recognized')
    expect(el.textContent).toMatch(/didn’t catch that as a command/i)
    expect(el.textContent).toContain('flurbish the scene')
    // Amber family — informational, not an alarm.
    expect(el.className).toContain('creative-spark-amber')
  })
})
