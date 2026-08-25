import { useEffect, useState } from 'react'
import { fetchEpisodes, fetchSeasons, type Episode, type Project, type Season } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Season/episode navigation for series projects (Task 2.6; DESIGN.md →
 * Navigation → Project Tree): a clean vertical list with `ui-label`
 * typography; the active episode is marked by the left-side accent line in
 * creative-spark-blue.
 */
export interface EpisodeSidebarProps {
  project: Project
  /** The open script's episode ID (null when nothing/opening or feature). */
  activeEpisodeId?: string | null
  onOpenEpisode?: (episode: Episode) => void
  /** Injection seams for tests. */
  loadSeasons?: (projectId: string) => Promise<{ seasons: Season[] }>
  loadEpisodes?: (projectId: string, seasonId: string) => Promise<{ episodes: Episode[] }>
}

interface SeasonWithEpisodes extends Season {
  episodes: Episode[]
}

export default function EpisodeSidebar({
  project,
  activeEpisodeId = null,
  onOpenEpisode,
  loadSeasons = fetchSeasons,
  loadEpisodes = fetchEpisodes,
}: EpisodeSidebarProps) {
  const [seasons, setSeasons] = useState<SeasonWithEpisodes[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (project.type === 'feature') {
      // Feature projects render a fixed single-script tree; nothing to fetch.
      setStatus('ready')
      return
    }

    let cancelled = false

    async function load() {
      try {
        const seasonsResult = await loadSeasons(project.id)
        const withEpisodes = await Promise.all(
          (seasonsResult.seasons ?? []).map(async (season) => {
            const episodesResult = await loadEpisodes(project.id, season.id)
            return { ...season, episodes: episodesResult.episodes ?? [] }
          })
        )
        if (cancelled) return
        setSeasons(withEpisodes)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [project.id, project.type, loadSeasons, loadEpisodes])

  return (
    <aside
      aria-label="Project navigation"
      className={cn('w-[280px] shrink-0 border-r border-slate-800 bg-container-low px-4 py-6', 'font-ui')}
    >
      <h2 className="mb-4 truncate text-[13px] font-medium tracking-wide text-on-surface">{project.title}</h2>

      {status === 'loading' && (
        <div role="status" aria-label="Loading project tree" className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
        </div>
      )}
      {status === 'error' && (
        <Alert variant="destructive" className="px-3 py-2">
          <AlertDescription className="text-xs">Couldn’t load the project tree.</AlertDescription>
        </Alert>
      )}

      {status === 'ready' && project.type === 'feature' && (
        <ul className="space-y-1">
          <li className="border-l-2 border-creative-spark-blue py-1.5 pl-3 text-[13px] text-on-surface">Screenplay</li>
        </ul>
      )}

      {status === 'ready' && project.type === 'series' && (
        <nav>
          {(seasons ?? []).map((season) => (
            <section key={season.id} className="mb-5">
              <h3 className="mb-1 pl-1 text-[13px] font-medium uppercase tracking-wide text-on-surface-variant">
                {season.title ? `${season.title} · ` : ''}S{season.season_number}
              </h3>
              <ul>
                {season.episodes.map((episode) => {
                  const isActive = episode.id === activeEpisodeId
                  return (
                    <li key={episode.id}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenEpisode?.(episode)}
                        aria-current={isActive ? 'true' : undefined}
                        className={cn(
                          'h-auto w-full justify-start rounded-none border-l-2 py-1.5 pl-3 text-left text-[13px]',
                          isActive
                            ? 'border-creative-spark-blue text-on-surface'
                            : 'border-transparent text-on-surface-variant hover:border-outline-variant hover:text-on-surface'
                        )}
                      >
                        E{episode.episode_number}
                        {episode.title ? ` — ${episode.title}` : ''}
                      </Button>
                    </li>
                  )
                })}
                {season.episodes.length === 0 && (
                  <li className="py-1.5 pl-3 text-xs text-on-surface-variant/60">No episodes yet</li>
                )}
              </ul>
            </section>
          ))}
        </nav>
      )}
    </aside>
  )
}
