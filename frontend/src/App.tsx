import { useCallback, useEffect, useState } from 'react'
import { cn } from './lib/utils'
import SignInScreen from './components/Auth/SignInScreen'
import EpisodeSidebar from './components/Navigation/EpisodeSidebar'
import ChatPanel from './components/ConversationMode/ChatPanel'
import QuickNotesPanel from './components/ConversationMode/QuickNotesPanel'
import ScreenplayEditor from './components/Editor/ScreenplayEditor'
import SubscriptionPanel from './components/Billing/SubscriptionPanel'
import TVFreeTierNotice from './components/Billing/TVFreeTierNotice'
import { Alert, AlertDescription } from './components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/ui/alert-dialog'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Separator } from './components/ui/separator'
import { Skeleton } from './components/ui/skeleton'
import {
  deleteProject as deleteProjectRequest,
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
        <div role="status" aria-label="Loading Storycrat" className="w-48 space-y-3">
          <Skeleton className="mx-auto h-5 w-24" />
          <Skeleton className="h-3 w-full" />
        </div>
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
      <header className="flex items-center justify-between px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setView({ name: 'projects' })}
          className="font-ui font-semibold tracking-tight text-on-surface"
        >
          Storycrat
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void onSignOut()}
          className="text-xs"
        >
          Sign out
        </Button>
      </header>
      <Separator />

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
  const [projectActionError, setProjectActionError] = useState<string | null>(null)
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
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
    if (openingProjectId || deletingProjectId) return
    setProjectActionError(null)
    setOpeningProjectId(project.id)
    try {
      if (project.type === 'feature') {
        const result = await fetchFeatureScript(project.id)
        if (!result.scriptId) throw new Error('missing feature script')
        onOpenProject(project, result.scriptId)
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
    } catch {
      setProjectActionError(`Could not open “${project.title}”. Try again, or delete it if you no longer need it.`)
    } finally {
      setOpeningProjectId(null)
    }
  }

  const remove = async (project: Project) => {
    if (deletingProjectId || openingProjectId) return
    setProjectActionError(null)
    setDeletingProjectId(project.id)
    try {
      await deleteProjectRequest(project.id)
      setProjects((current) => current?.filter((item) => item.id !== project.id) ?? null)
    } catch {
      setProjectActionError(`Could not delete “${project.title}”. Nothing was removed. Try again.`)
    } finally {
      setDeletingProjectId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="font-ui text-lg font-semibold text-on-surface">Your projects</h1>
      {createError && <Alert variant="destructive" className="mt-3"><AlertDescription>{createError}</AlertDescription></Alert>}

      {error && <Alert variant="destructive" className="mt-3"><AlertDescription>Couldn&rsquo;t load projects.</AlertDescription></Alert>}
      {projectActionError && <Alert variant="destructive" className="mt-3"><AlertDescription>{projectActionError}</AlertDescription></Alert>}

      <ul className="mt-4 space-y-2">
        {(projects ?? []).map((project) => (
          <li key={project.id}>
            <Card className="gap-0 overflow-hidden py-0">
            <CardContent className="flex items-stretch p-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void open(project)}
                disabled={openingProjectId !== null || deletingProjectId !== null}
                className="h-auto min-w-0 flex-1 justify-start rounded-none px-4 py-3 text-left"
              >
                {openingProjectId === project.id ? 'Opening…' : project.title}
                <Badge variant="outline" className="ml-2 uppercase tracking-wide">{project.type}</Badge>
              </Button>
              <Separator orientation="vertical" className="h-auto" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={openingProjectId !== null || deletingProjectId !== null}
                    aria-label={`Delete ${project.title}`}
                    className="h-auto rounded-none px-3 text-xs hover:text-error"
                    onClick={() => setProjectActionError(null)}
                  >
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete “{project.title}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete this project and all of its screenplay data? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deletingProjectId !== null}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={deletingProjectId !== null}
                      onClick={() => void remove(project)}
                    >
                      {deletingProjectId === project.id ? 'Deleting…' : 'Delete project'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
            </Card>
          </li>
        ))}
        {projects !== null && projects.length === 0 && (
          <li className="font-ui text-sm text-on-surface-variant">No projects yet — create your first one below.</li>
        )}
      </ul>

      <Card className="mt-8 gap-0 py-4">
      <CardContent className="px-4">
      <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
        <Label htmlFor="new-project-title" className="sr-only">New project title</Label>
        <Input
          id="new-project-title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New project title"
          className="flex-1"
        />
        <div className="sm:w-40">
          <Select value={newType} onValueChange={(value) => setNewType(value as 'feature' | 'series')}>
            <SelectTrigger aria-label="Project type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="series">Series</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={creating || !newTitle.trim()}>
          Create
        </Button>
      </form>
      </CardContent>
      </Card>

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
          <Button type="button" variant="ghost" size="sm" onClick={onBack} className="text-xs">
            ← Projects
          </Button>
          {/* Desktop persistent toggle (Task 6.1). Mobile uses the bottom bar. */}
          <Button
            type="button"
            onClick={toggleConversation}
            aria-pressed={chatOpen}
            size="sm"
            className="hidden text-xs md:inline-flex"
          >
            {chatOpen ? 'Hide conversation' : '✦ Conversation'}
          </Button>
        </div>

        <div className="flex flex-1 items-start">
          <div className={cn('min-w-0 flex-1', chatOpen && 'hidden md:block')}>
            {view.scriptId ? (
              <ScreenplayEditor scriptId={view.scriptId} />
            ) : (
              <main className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
                <Card className="w-full max-w-lg">
                  <CardContent className="flex flex-col items-center px-6 text-center">
                    <h1 className="font-ui text-lg font-semibold text-on-surface">{view.project.title}</h1>
                    <p className="mt-2 max-w-md font-ui text-sm leading-relaxed text-on-surface-variant">
                      This series doesn&rsquo;t have an episode yet. Create Episode 1 to open the page — it uses your one-script allowance.
                    </p>
                    <Button type="button" onClick={() => void createFirstEpisode()} disabled={creatingEpisode} className="mt-6">
                      {creatingEpisode ? 'Creating…' : 'Create Episode 1'}
                    </Button>
                    {episodeError && (
                      <Alert variant="destructive" className="mt-3 text-left">
                        <AlertDescription>Couldn&rsquo;t create the episode — it may exceed your free allowance.</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleConversation}
                className="m-2 text-xs md:hidden"
              >
                ← Back to script
              </Button>
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => setChatOpen(false)}
            aria-pressed={!chatOpen}
            className={cn('h-auto flex-1 rounded-none py-3 text-xs', !chatOpen ? 'border-t-2 border-creative-spark-blue text-on-surface' : 'text-on-surface-variant')}
          >
            ✍ Editor
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={toggleConversation}
            aria-pressed={chatOpen}
            className={cn('h-auto flex-1 rounded-none py-3 text-xs', chatOpen ? 'border-t-2 border-creative-spark-blue text-on-surface' : 'text-on-surface-variant')}
          >
            ✦ Conversation
          </Button>
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
        <div role="status" aria-label="Loading project navigation" className="w-[280px] space-y-3 px-4 py-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
        </div>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={onBack} className="mx-2 mb-2 text-xs">
        ← All projects
      </Button>
    </div>
  )
}
