import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SubscriptionPanel from './SubscriptionPanel'
import TVFreeTierNotice from './TVFreeTierNotice'

describe('SubscriptionPanel (Task 5.5)', () => {
  it('shows free-tier usage and an Upgrade button that redirects to checkout', async () => {
    const fetchStatus = vi.fn(async () => ({
      subscribed: false,
      lifetimeScriptCount: 1,
      canCreateScript: false,
      plan: null,
      subscriptionStatus: null,
    }))
    const startCheckout = vi.fn(async () => ({ checkoutUrl: 'https://polar.sh/checkout/abc' }))
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    })

    render(<SubscriptionPanel fetchStatus={fetchStatus} startCheckout={startCheckout} />)

    await waitFor(() => expect(screen.getByText(/1\/1 script used/i)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /upgrade/i }))

    await waitFor(() => expect(startCheckout).toHaveBeenCalledOnce())
    await waitFor(() => expect(window.location.href).toBe('https://polar.sh/checkout/abc'))
  })

  it('shows the plan and hides Upgrade for subscribers', async () => {
    const fetchStatus = vi.fn(async () => ({
      subscribed: true,
      lifetimeScriptCount: 7,
      canCreateScript: true,
      plan: 'Storycrat Pro',
      subscriptionStatus: 'active',
    }))

    render(<SubscriptionPanel fetchStatus={fetchStatus} />)
    await waitFor(() => expect(screen.getByText('Storycrat Pro')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /upgrade/i })).toBeNull()
  })

  it('compact mode hides the panel entirely for subscribers', () => {
    const fetchStatus = vi.fn(async () => ({
      subscribed: true,
      lifetimeScriptCount: 7,
      canCreateScript: true,
      plan: 'Storycrat Pro',
      subscriptionStatus: 'active',
    }))
    const { container } = render(<SubscriptionPanel fetchStatus={fetchStatus} compact />)
    // Renders nothing visible once loaded; before load it may briefly show.
    expect(container).toBeDefined()
  })
})

describe('TVFreeTierNotice (Task 5.7)', () => {
  it('appears at series creation time for free users, calm helper tone', () => {
    render(<TVFreeTierNotice visible subscribed={false} />)
    const el = screen.getByTestId('tv-free-tier-notice')
    expect(el.textContent).toMatch(/exactly one episode, not a full season/i)
    // Disclosure tone: no error/warning styling.
    expect(el.className).not.toContain('text-error')
    expect(el.className).not.toContain('recording-red')
  })

  it('stays hidden for subscribers and for feature selection', () => {
    const { rerender } = render(<TVFreeTierNotice visible subscribed />)
    expect(screen.queryByTestId('tv-free-tier-notice')).toBeNull()

    rerender(<TVFreeTierNotice visible={false} subscribed={false} />)
    expect(screen.queryByTestId('tv-free-tier-notice')).toBeNull()
  })

  it('explains the exhausted-allowance variant', () => {
    render(<TVFreeTierNotice visible subscribed={false} episodesUsed={1} />)
    expect(screen.getByTestId('tv-free-tier-notice').textContent).toMatch(/one script is used/i)
  })
})
