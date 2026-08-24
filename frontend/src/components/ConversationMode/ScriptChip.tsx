import { cn } from '@/lib/utils'
import type { Citation } from '@/lib/api'

/**
 * Script Chip (DESIGN.md → AI Conversation): a small monospaced badge linking
 * to the scene the AI is drawing on. For TV, a citation from OUTSIDE the
 * currently open episode carries an "EP.N" prefix so the writer immediately
 * knows the material comes from elsewhere (Task 4.10).
 */
export interface ScriptChipProps {
  citation: Citation
  currentEpisodeId?: string | null
  onClick?: () => void
}

export default function ScriptChip({ citation, currentEpisodeId = null, onClick }: ScriptChipProps) {
  const crossEpisode =
    citation.episodeId !== null && currentEpisodeId !== null && citation.episodeId !== currentEpisodeId

  return (
    <button
      type="button"
      data-testid="script-chip"
      data-episode={citation.episodeId ?? undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-script text-[11px]',
        'border border-creative-spark-blue/50 bg-creative-spark-blue/10 text-on-surface',
        'hover:bg-creative-spark-blue/20 focus:outline-none focus:ring-1 focus:ring-creative-spark-blue',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {crossEpisode && (
        <span className="font-ui font-semibold text-creative-spark-blue" title="From another episode">
          EP.{episodeNumber(citation)}
        </span>
      )}
      <span>{citation.label}</span>
    </button>
  )
}

function episodeNumber(citation: Citation): string {
  // Episode ids are opaque; derive a stable short tag for display.
  const match = citation.episodeId?.match(/(\d+)/)
  return match ? match[1] : '?'
}
