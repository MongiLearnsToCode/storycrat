import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the wordmark and tagline', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Storycrat' })).toBeInTheDocument()
    expect(screen.getByText(/voice-first screenwriting companion/i)).toBeInTheDocument()
  })
})
