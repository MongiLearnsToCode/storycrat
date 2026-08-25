import { useCallback, useEffect, useState } from 'react'
import { cn } from './lib/utils'
import SignInScreen from './components/Auth/SignInScreen'
import EpisodeSidebar from './components/Navigation/EpisodeSidebar'
import ChatPanel from './components/ConversationMode/ChatPanel'
import QuickNotesPanel from './components/ConversationMode/QuickNotesPanel'
import ScreenplayEditor from './components/Editor/ScreenplayEditor'
import SubscriptionPanel from './components/Billing/SubscriptionPanel'
import TVFreeTierNotice from './components/Billing/TVFreeTierNotice'
import {
  fetchEpisodes,
  fetchFeatureScript,
  fetchMe,
  fetchProject,
  fetchSeasons,
  logout,
  type Episode,
  type Project,
  type SessionUser,
} from './lib/api'

/**
 * Application shell: sign-in gate, project list, and the writing workspace
 * (editor + season/episode navigation + conversation drawer).
 */
type View =
  | { name: 'projects' }
  | { name: 'editor'; project: Project; scriptId: string | null; episodeId: string | null; seasonId?: string | null }

export default function App() {
  const [session, setSession] = useState<SessionUser | null | 'loading'>('loading')
  // A signed-in tab learns about its new session when the verify redirect lands.
  useEffect(() => {
    const check = () => void fetchMe().then((user) => setSession(user))
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [])

  if (session === 'loading') {
    return (
      <main className="flex min-h-full items-center justify-center">
        <p role="status" className="font-ui text-sm text-on-surface-variant">Loading…</p>
      </main>
    )
  }

  if (session === null) {
    return <SignInScreen onSignedIn={() => void fetchMe().then(setSession)} />
  }

  return <Workspace onSignOut={async () => { await logout(); setSession(null) }} />
}

function Workspace({ onSignOut }: { onSignOut: () => void }) {
  const [view, setView] = useState<View>({ name: 'projects' })

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <button
          type="button"
          onClick={() => setView({ name: 'projects' })}
          className="font-ui text-sm font-semibold tracking-tight text-on-surface"
        >
          Storycrat
        </button>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="font-ui text-xs text-on-surface-variant hover:text-on-surface"
        >
          Sign out
        </button>
      </header>

      <div className="flex-1">
        {view.name === 'projects' ? (
          <ProjectList onOpenProject={(project, scriptId) => setView({ name: 'editor', project, scriptId, episodeId: null })} />
        ) : (
          <EditorWorkspace view={view} onOpenEpisode={(project, scriptId, episodeId, seasonId) => setView({ name: 'editor', project, scriptId, episodeId, seasonId })} onBack={() => setView({ name: 'projects' })} />
        )}
      </div>
    </div>
  )
}

function ProjectList({ onOpenProject }: { onOpenProject: (project: Project, scriptId: string | null) => void }) {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'feature' | 'series'>('feature')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState<boolean | null>(null)

  useEffect(() => {
    void fetch('/api/billing/subscription')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { subscribed?: boolean } | null) => setSubscribed(body?.subscribed ?? false))
      .catch(() => setSubscribed(false))
  }, [])

  const load = useCallback(async () => {
    try {
      const listResponse = await fetch('/api/projects')
      if (!listResponse.ok) throw new Error(String(listResponse.status))
      const listBody = (await listResponse.json()) as { projects: Project[] }
      setProjects(listBody.projects)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newTitle.trim() || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), type: newType }),
      })
      if (response.status === 402) {
        setCreateError('Your free script is already used — upgrade for unlimited scripts and episodes.')
        return
      }
      if (!response.ok) {
        setCreateError('Couldn\'t create the project — try again.')
        return
      }
      const body = (await response.json()) as { project: Project }
      setNewTitle('')
      // Route straight into the new project — creation should land you at the page.
      await open(body.project)
    } finally {
      setCreating(false)
    }
  }

  const open = async (project: Project) => {
    if (project.type === 'feature') {
      const result = await fetchFeatureScript(project.id)
      if (result.scriptId) onOpenProject(project, result.scriptId)
      return
    }
    // Series: open the first episode's script; with none yet, open the
    // workspace so the writer can create Episode 1 from inside it.
    const seasons = await fetchSeasons(project.id)
    const firstSeason = seasons.seasons[0]
    if (firstSeason) {
      const episodes = await fetchEpisodes(project.id, firstSeason.id)
      const firstEpisode = episodes.episodes[0]
      if (firstEpisode?.script_id) {
        onOpenProject(project, firstEpisode.script_id)
        return
      }
    }
    onOpenProject(project, null)
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="font-ui text-lg font-semibold text-on-surface">Your projects</h1>
      {createError && <p role="alert" className="mt-3 font-ui text-sm text-error">{createError}</p>}

      {error && <p role="alert" className="mt-3 font-ui text-sm text-error">Couldn&rsquo;t load projects.</p>}

      <ul className="mt-4 space-y-2">
        {(projects ?? []).map((project) => (
          <li key={project.id}>
            <button
              type="button"
              onClick={() => void open(project)}
              className="w-full rounded-lg border border-outline-variant bg-container-low px-4 py-3 text-left font-ui text-sm text-on-surface hover:border-creative-spark-blue"
            >
              {project.title}
              <span className="ml-2 text-xs uppercase tracking-wide text-on-surface-variant">{project.type}</span>
            </button>
          </li>
        ))}
        {projects !== null && projects.length === 0 && (
          <li className="font-ui text-sm text-on-surface-variant">No projects yet — create your first one below.</li>
        )}
      </ul>

      <form onSubmit={create} className="mt-8 flex flex-col gap-3 rounded-lg border border-outline-variant bg-container-low p-4 sm:flex-row">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New project title"
          aria-label="New project title"
          className="flex-1 rounded-md border border-outline-variant bg-container-lowest px-3 py-2 font-ui text-sm text-on-surface outline-none focus:border-creative-spark-blue"
        />
        <div className="sm:w-40">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'feature' | 'series')}
            aria-label="Project type"
            className="w-full rounded-md border border-outline-variant bg-container-lowest px-3 py-2 font-ui text-sm text-on-surface outline-none focus:border-creative-spark-blue"
          >
            <option value="feature">Feature</option>
            <option value="series">Series</option>
          </select>
        </div>
        <button type="submit" disabled={creating || !newTitle.trim()} className="rounded-md border border-creative-spark-blue bg-midnight-charcoal px-4 py-2 font-ui text-sm font-medium text-on-surface disabled:opacity-40">
          Create
        </button>
      </form>

      {/* Task 5.7: disclose the one-episode allowance at series creation time. */}
      <div className="mt-2">
        <TVFreeTierNotice visible={newType === 'series'} subscribed={subscribed ?? false} />
      </div>

      <div className="mt-6">
        <SubscriptionPanel />
      </div>
    </main>
  )
}

function EditorWorkspace({
  view,
  onOpenEpisode,
  onBack,
}: {
  view: Extract<View, { name: 'editor' }>
  onOpenEpisode: (project: Project, scriptId: string, episodeId: string, seasonId: string | null) => void
  onBack: () => void
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [creatingEpisode, setCreatingEpisode] = useState(false)
  const [episodeError, setEpisodeError] = useState(false)

  // Series with no episode yet: create Season 1 / Episode 1 and open its script.
  const createFirstEpisode = async () => {
    if (creatingEpisode) return
    setCreatingEpisode(true)
    setEpisodeError(false)
    try {
      const seasonResponse = await fetch(`/api/projects/${view.project.id}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!seasonResponse.ok) throw new Error('season')
      const season = ((await seasonResponse.json()) as { season: { id: string } }).season
      const episodeResponse = await fetch(`/api/projects/${view.project.id}/seasons/${season.id}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Episode 1' }),
      })
      if (!episodeResponse.ok) throw new Error('episode')
      const episode = ((await episodeResponse.json()) as { episode: { id: string; script_id: string } }).episode
      onOpenEpisode(view.project, episode.script_id, episode.id, season.id)
    } catch {
      setEpisodeError(true)
    } finally {
      setCreatingEpisode(false)
    }
  }

  // Task 6.7: opening Conversation stops any live dictation session cleanly
  // (buffered text commits per normal boundary rules server-side).
  const toggleConversation = () => {
    const opening = !chatOpen
    if (opening) {
      window.dispatchEvent(new CustomEvent('storycrat:stop-dictation'))
    }
    setChatOpen(opening)
  }

  return (
    <div className="flex min-h-full">
      {view.project.type === 'series' && (
        <SeriesSidebar projectId={view.project.id} activeEpisodeId={view.episodeId} onOpenEpisode={onOpenEpisode} onBack={onBack} />
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pt-4">
          <button type="button" onClick={onBack} className="font-ui text-xs text-on-surface-variant hover:text-on-surface">
            ← Projects
          </button>
          {/* Desktop persistent toggle (Task 6.1). Mobile uses the bottom bar. */}
          <button
            type="button"
            onClick={toggleConversation}
            aria-pressed={chatOpen}
            className="hidden rounded-md border border-creative-spark-blue bg-midnight-charcoal px-3 py-1.5 font-ui text-xs font-medium text-on-surface md:block"
          >
            {chatOpen ? 'Hide conversation' : '✦ Conversation'}
          </button>
        </div>

        <div className="flex flex-1 items-start">
          <div className={cn('min-w-0 flex-1', chatOpen && 'hidden md:block')}>
            {view.scriptId ? (
              <ScreenplayEditor scriptId={view.scriptId} />
            ) : (
              <main className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
                <h1 className="font-ui text-lg font-semibold text-on-surface">{view.project.title}</h1>
                <p className="mt-2 max-w-md font-ui text-sm leading-relaxed text-on-surface-variant">
                  This series doesn&rsquo;t have an episode yet. Create Episode 1 to open the page — it uses your one-script allowance.
                </p>
                <button
                  type="button"
                  onClick={() => void createFirstEpisode()}
                  disabled={creatingEpisode}
                  className="mt-6 rounded-md border border-creative-spark-blue bg-midnight-charcoal px-4 py-2 font-ui text-sm font-medium text-on-surface disabled:opacity-40"
                >
                  {creatingEpisode ? 'Creating…' : 'Create Episode 1'}
                </button>
                {episodeError && (
                  <p role="alert" className="mt-3 font-ui text-sm text-error">
                    Couldn&rsquo;t create the episode — it may exceed your free allowance.
                  </p>
                )}
              </main>
            )}
          </div>

          {chatOpen && (
            <aside
              className={cn(
                'border-l border-slate-800',
                // Mobile: full-screen overlay toggled by the bottom bar (DESIGN.md layout).
                'fixed inset-0 z-20 bg-midnight-slate md:sticky md:top-0 md:inset-auto md:z-auto md:h-screen md:w-full md:max-w-md md:shrink-0 md:bg-transparent'
              )}
            >
              <button
                type="button"
                onClick={toggleConversation}
                className="px-4 pt-3 font-ui text-xs text-on-surface-variant md:hidden"
              >
                ← Back to script
              </button>
              <ChatPanel projectId={view.project.id} episodeId={view.episodeId ?? undefined} currentEpisodeId={view.episodeId} />
              <div className="hidden p-4 md:block">
                <QuickNotesPanel projectId={view.project.id} episodeId={view.episodeId ?? undefined} currentEpisodeId={view.episodeId} />
              </div>
            </aside>
          )}
        </div>

        {/* Mobile persistent bottom bar (DESIGN.md → Layout: bottom bar toggles editor/conversation). */}
        <nav
          aria-label="Mode"
          className={cn(
            'sticky bottom-0 z-30 flex border-t border-slate-800 bg-container-lowest md:hidden',
            chatOpen && 'hidden'
          )}
        >
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            aria-pressed={!chatOpen}
            className={cn('flex-1 py-3 font-ui text-xs font-medium', !chatOpen ? 'border-t-2 border-creative-spark-blue text-on-surface' : 'text-on-surface-variant')}
          >
            ✍ Editor
          </button>
          <button
            type="button"
            onClick={toggleConversation}
            aria-pressed={chatOpen}
            className={cn('flex-1 py-3 font-ui text-xs font-medium', chatOpen ? 'border-t-2 border-creative-spark-blue text-on-surface' : 'text-on-surface-variant')}
          >
            ✦ Conversation
          </button>
        </nav>
      </div>
    </div>
  )
}

function SeriesSidebar({
  projectId,
  activeEpisodeId,
  onOpenEpisode,
  onBack,
}: {
  projectId: string
  activeEpisodeId: string | null
  onOpenEpisode: (project: Project, scriptId: string, episodeId: string, seasonId: string | null) => void
  onBack: () => void
}) {
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    void fetchProject(projectId).then((result) => setProject(result.project))
  }, [projectId])

  const handleOpen = useCallback(
    (episode: Episode) => {
      if (episode.script_id) {
        onOpenEpisode({ id: projectId, title: project?.title ?? '', type: 'series' }, episode.script_id, episode.id, episode.season_id)
      }
    },
    [projectId, project?.title, onOpenEpisode]
  )

  return (
    <div className="border-r border-slate-800">
      {project ? (
        <EpisodeSidebar project={project} activeEpisodeId={activeEpisodeId} onOpenEpisode={handleOpen} />
      ) : (
        <div className="w-[280px] px-4 py-6 font-ui text-xs text-on-surface-variant">Loading…</div>
      )}
      <button type="button" onClick={onBack} className="px-4 pb-4 font-ui text-xs text-on-surface-variant hover:text-on-surface">
        ← All projects
      </button>
    </div>
  )
}
