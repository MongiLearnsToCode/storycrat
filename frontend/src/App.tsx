import { useCallback, useEffect, useState } from 'react'
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
  | { name: 'editor'; project: Project; scriptId: string; episodeId: string | null }

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
          <EditorWorkspace view={view} onOpenEpisode={(project, scriptId, episodeId) => setView({ name: 'editor', project, scriptId, episodeId })} onBack={() => setView({ name: 'projects' })} />
        )}
      </div>
    </div>
  )
}

function ProjectList({ onOpenProject }: { onOpenProject: (project: Project, scriptId: string) => void }) {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'feature' | 'series'>('feature')
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState<boolean | null>(null)

  useEffect(() => {
    void fetch('/api/billing/subscription')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { subscribed?: boolean } | null) => setSubscribed(body?.subscribed ?? false))
      .catch(() => setSubscribed(false))
  }, [])

  const load = useCallback(async () => {
    try {
      const result = await fetchSeasons('') // replaced below
      void result
      const listResponse = await fetch('/api/projects')
      const listBody = (await listResponse.json()) as { projects: Project[] }
      setProjects(listBody.projects)
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
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), type: newType }),
      })
      if (response.ok) {
        setNewTitle('')
        await load()
      }
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
    // Series: open the first episode's script when one exists.
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
    setNotice('This series has no episodes yet — open it, then create one from the episode list.')
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="font-ui text-lg font-semibold text-on-surface">Your projects</h1>
      {notice && <p className="mt-3 font-ui text-sm text-on-surface-variant">{notice}</p>}

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
  onOpenEpisode: (project: Project, scriptId: string, episodeId: string) => void
  onBack: () => void
}) {
  const [chatOpen, setChatOpen] = useState(false)

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
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            aria-pressed={chatOpen}
            className="rounded-md border border-creative-spark-blue bg-midnight-charcoal px-3 py-1.5 font-ui text-xs font-medium text-on-surface"
          >
            {chatOpen ? 'Hide conversation' : '✦ Conversation'}
          </button>
        </div>

        <div className="flex flex-1 items-start">
          <div className="min-w-0 flex-1">
            <ScreenplayEditor scriptId={view.scriptId} />
          </div>

          {chatOpen && (
            <aside className="sticky top-0 h-screen w-full max-w-md shrink-0 border-l border-slate-800">
              <ChatPanel projectId={view.project.id} episodeId={view.episodeId ?? undefined} currentEpisodeId={view.episodeId} />
              <div className="p-4">
                <QuickNotesPanel projectId={view.project.id} episodeId={view.episodeId ?? undefined} currentEpisodeId={view.episodeId} />
              </div>
            </aside>
          )}
        </div>
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
  onOpenEpisode: (project: Project, scriptId: string, episodeId: string) => void
  onBack: () => void
}) {
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    void fetchProject(projectId).then((result) => setProject(result.project))
  }, [projectId])

  const handleOpen = useCallback(
    (episode: Episode) => {
      if (episode.script_id) {
        onOpenEpisode({ id: projectId, title: project?.title ?? '', type: 'series' }, episode.script_id, episode.id)
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
