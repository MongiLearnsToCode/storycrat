import { cn } from '@/lib/utils'

/**
 * Free-tier TV disclosure (Task 5.7, PRD Req 45): shown at TV Series
 * creation time — BEFORE the block hits, not after. Deliberately calm
 * informational helper text (`ui-helper` typography), NOT a warning banner:
 * it's disclosure, not an obstacle.
 */
export default function TVFreeTierNotice({
  visible,
  subscribed = false,
  episodesUsed = 0,
}: {
  visible: boolean
  subscribed?: boolean
  episodesUsed?: number
}) {
  if (!visible || subscribed) return null

  const remaining = Math.max(0, 1 - episodesUsed)

  return (
    <p
      data-testid="tv-free-tier-notice"
      className={cn('font-ui text-xs leading-relaxed text-on-surface-variant')}
    >
      {remaining > 0
        ? 'Heads up: the free plan covers one script — for a series that means exactly one episode, not a full season. Upgrade anytime for unlimited episodes.'
        : 'Heads up: the free plan’s one script is used, so new series will start empty until you upgrade. Your existing work stays yours.'}
    </p>
  )
}
