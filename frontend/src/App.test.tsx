import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  deleteProject: vi.fn(),
  fetchScript: vi.fn(),
  saveScriptElements: vi.fn(),
  requestSuggestion: vi.fn(),
}))

const mocked = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
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

  it('routes straight into the editor after creating a feature project', async () => {
    mocked.fetchMe.mockResolvedValue({ id: 'u1' })
    mocked.fetchFeatureScript.mockResolvedValue({ scriptId: 'sc-new' })
    mocked.fetchScript.mockResolvedValue({
      script: { id: 'sc-new', project_id: 'p-new', episode_id: null },
      elements: [],
    })
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = String(input)
      const method = input instanceof Request ? input.method : (init?.method ?? 'GET')
      const isPost = method.toUpperCase() === 'POST'
      if (url.endsWith('/api/projects') && !isPost) {
        return new Response(JSON.stringify({ projects: [] }), { status: 200 })
      }
      if (url.includes('/api/billing/subscription')) {
        return new Response(JSON.stringify({ subscribed: true, lifetimeScriptCount: 0, canCreateScript: true, plan: null, subscriptionStatus: null }), { status: 200 })
      }
      if (url.endsWith('/api/projects') && isPost) {
        return new Response(JSON.stringify({ project: { id: 'p-new', title: 'New Work', type: 'feature' } }), { status: 201 })
      }
      if (url.includes('/feature-script')) {
        return new Response(JSON.stringify({ scriptId: 'sc-new' }), { status: 200 })
      }
      if (url.includes('/api/scripts/')) {
        return new Response(JSON.stringify({ script: { id: 'sc-new', project_id: 'p-new', episode_id: null }, elements: [] }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch)

    render(<App />)
    await waitFor(() => expect(screen.getByText('Your projects')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('New project title'), { target: { value: 'New Work' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    // Editor mounts for the new script (blank-page state proves we routed in).
    await waitFor(() => expect(screen.getByText(/page is blank/i)).toBeInTheDocument(), { timeout: 3000 })
    vi.unstubAllGlobals()
  })

  it('shows the workspace with the project list for authenticated users', async () => {
    mocked.fetchMe.mockResolvedValue({ id: 'u1' })
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request): Promise<Response> => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return new Response(JSON.stringify({ projects: [{ id: 'p1', title: 'Pilot', type: 'feature' }] }), { status: 200 })
      }
      if (url.includes('/api/billing/subscription')) {
        return new Response(JSON.stringify({ subscribed: true, lifetimeScriptCount: 0, canCreateScript: true, plan: null, subscriptionStatus: null }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }))

    render(<App />)
    await waitFor(() => expect(screen.getByText('Your projects')).toBeInTheDocument())
    expect(await screen.findByText(/Pilot/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('uses the shadcn Select for project type and updates the series disclosure', async () => {
    mocked.fetchMe.mockResolvedValue({ id: 'u1' })
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request): Promise<Response> => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return new Response(JSON.stringify({ projects: [] }), { status: 200 })
      }
      if (url.includes('/api/billing/subscription')) {
        return new Response(JSON.stringify({ subscribed: false }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }))

    render(<App />)
    const trigger = await screen.findByRole('combobox', { name: 'Project type' })
    expect(trigger.tagName).toBe('BUTTON')

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('option', { name: 'Series' }))
    expect(screen.getByTestId('tv-free-tier-notice')).toBeInTheDocument()
  })

  it('requires confirmation before deleting a project and removes it after success', async () => {
    mocked.fetchMe.mockResolvedValue({ id: 'u1' })
    mocked.deleteProject.mockResolvedValue()
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request): Promise<Response> => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return new Response(JSON.stringify({ projects: [{ id: 'p1', title: 'Stuck Project', type: 'feature' }] }), { status: 200 })
      }
      if (url.includes('/api/billing/subscription')) {
        return new Response(JSON.stringify({ subscribed: false }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }))

    render(<App />)
    expect(await screen.findByText('Stuck Project')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Stuck Project' }))
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    expect(mocked.deleteProject).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete project' }))
    await waitFor(() => expect(mocked.deleteProject).toHaveBeenCalledWith('p1'))
    await waitFor(() => expect(screen.queryByText('Stuck Project')).not.toBeInTheDocument())
  })

  it('surfaces a feature-project open failure instead of leaving a dead button', async () => {
    mocked.fetchMe.mockResolvedValue({ id: 'u1' })
    mocked.fetchFeatureScript.mockRejectedValue(new Error('404'))
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request): Promise<Response> => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return new Response(JSON.stringify({ projects: [{ id: 'p1', title: 'Stuck Project', type: 'feature' }] }), { status: 200 })
      }
      if (url.includes('/api/billing/subscription')) {
        return new Response(JSON.stringify({ subscribed: false }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }))

    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Stuck Project feature/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not open/i)
  })
})
