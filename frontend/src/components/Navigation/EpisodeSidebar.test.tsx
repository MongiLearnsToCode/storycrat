import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EpisodeSidebar from './EpisodeSidebar'
import type { Episode, Project } from '@/lib/api'

const series: Project = { id: 'p1', title: 'Nightshift', type: 'series' }
const feature: Project = { id: 'p2', title: 'The Long Night', type: 'feature' }

const seasons = {
  seasons: [
    { id: 's1', project_id: 'p1', season_number: 1, title: 'Season One' },
    { id: 's2', project_id: 'p1', season_number: 2, title: '' },
  ],
}

const episodesFor = async (_projectId: string, seasonId: string): Promise<{ episodes: Episode[] }> =>
  seasonId === 's1'
    ? {
        episodes: [
          { id: 'e1', season_id: 's1', episode_number: 1, title: 'Cold Open', script_id: 'sc-e1' },
          { id: 'e2', season_id: 's1', episode_number: 2, title: '', script_id: 'sc-e2' },
        ],
      }
    : { episodes: [] }

describe('EpisodeSidebar', () => {
  it('renders the project tree with seasons and episodes', async () => {
    render(<EpisodeSidebar project={series} loadSeasons={async () => seasons} loadEpisodes={episodesFor} />)

    await waitFor(() => expect(screen.getByText(/S1/)).toBeInTheDocument())
    expect(screen.getByText('Season One · S1')).toBeInTheDocument()
    expect(screen.getByText('E1 — Cold Open')).toBeInTheDocument()
    // Untitled episodes show only their number.
    expect(screen.getByText('E2')).toBeInTheDocument()
    // Empty seasons are visible with a quiet placeholder.
    expect(screen.getByText(/no episodes yet/i)).toBeInTheDocument()
  })

  it('marks the active episode with the creative-spark accent line and aria-current', async () => {
    render(<EpisodeSidebar project={series} activeEpisodeId="e2" loadSeasons={async () => seasons} loadEpisodes={episodesFor} />)

    const active = await screen.findByRole('button', { name: 'E2' })
    expect(active.getAttribute('aria-current')).toBe('true')
    expect(active.className).toContain('border-creative-spark-blue')

    const inactive = screen.getByRole('button', { name: 'E1 — Cold Open' })
    expect(inactive.getAttribute('aria-current')).toBeNull()
    expect(inactive.classList).not.toContain('border-creative-spark-blue')
  })

  it('reports the selected episode upward', async () => {
    const onOpenEpisode = vi.fn()
    render(
      <EpisodeSidebar
        project={series}
        onOpenEpisode={onOpenEpisode}
        loadSeasons={async () => seasons}
        loadEpisodes={episodesFor}
      />
    )

    fireEvent.click(await screen.findByRole('button', { name: 'E1 — Cold Open' }))
    expect(onOpenEpisode).toHaveBeenCalledWith((await episodesFor('p1', 's1')).episodes[0])
  })

  it('shows a single screenplay entry for feature projects without fetching seasons', async () => {
    const loadSeasons = vi.fn()
    render(<EpisodeSidebar project={feature} loadSeasons={loadSeasons as never} />)

    await waitFor(() => expect(screen.getByText('Screenplay')).toBeInTheDocument())
    expect(loadSeasons).not.toHaveBeenCalled()
  })

  it('surfaces load errors', async () => {
    const loadSeasons = vi.fn(async () => {
      throw new Error('500')
    })
    render(<EpisodeSidebar project={series} loadSeasons={loadSeasons} />)
    await waitFor(() => expect(screen.getByText(/couldn’t load the project tree/i)).toBeInTheDocument())
  })
})
