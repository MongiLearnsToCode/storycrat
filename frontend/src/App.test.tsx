import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './lib/api'

vi.mock('./lib/api', () => ({
  fetchMe: vi.fn(),
  requestMagicLink: vi.fn(),
  logout: vi.fn(),
  fetchProjects: vi.fn(),
  fetchSeasons: vi.fn(async () => ({ seasons: [] })),
  fetchEpisodes: vi.fn(async () => ({ episodes: [] })),
  fetchProject: vi.fn(),
  fetchFeatureScript: vi.fn(),
  fetchScript: vi.fn(),
  saveScriptElements: vi.fn(),
  requestSuggestion: vi.fn(),
}))

const mocked = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('App shell', () => {
  it('shows the sign-in screen for unauthenticated visitors and requests a magic link', async () => {
    mocked.fetchMe.mockResolvedValue(null)
    mocked.requestMagicLink.mockResolvedValue({ ok: true })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/sign in to storycrat/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'writer@studio.com' } })
    fireEvent.click(screen.getByRole('button', { name: /email me a sign-in link/i }))

    await waitFor(() => expect(mocked.requestMagicLink).toHaveBeenCalledWith('writer@studio.com'))
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument()
  })

  it('shows the workspace with the project list for authenticated users', async () => {
    mocked.fetchMe.mockResolvedValue({ id: 'u1' })
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return new Response(JSON.stringify({ projects: [{ id: 'p1', title: 'Pilot', type: 'feature' }] }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }))

    render(<App />)
    await waitFor(() => expect(screen.getByText('Your projects')).toBeInTheDocument())
    expect(await screen.findByText(/Pilot/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
