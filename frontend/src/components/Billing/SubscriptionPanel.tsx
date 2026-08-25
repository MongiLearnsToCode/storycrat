import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Subscription panel (Task 5.5): shows tier state and the upgrade path.
 * State comes from the server (Polar webhooks are the only writer); the
 * checkout URL is created server-side — the browser never holds Polar keys.
 */
export interface SubscriptionPanelProps {
  fetchStatus?: (init?: RequestInit) => Promise<TierStatusResponse>
  startCheckout?: (init?: RequestInit) => Promise<{ checkoutUrl: string | null; alreadySubscribed?: boolean }>
  compact?: boolean
}

export interface TierStatusResponse {
  subscribed: boolean
  lifetimeScriptCount: number
  canCreateScript: boolean
  plan: string | null
  subscriptionStatus: string | null
}

export default function SubscriptionPanel({ fetchStatus, startCheckout, compact = false }: SubscriptionPanelProps) {
  const loader = fetchStatus ?? defaultFetchStatus
  const checkout = startCheckout ?? defaultStartCheckout

  const [status, setStatus] = useState<TierStatusResponse | null>(null)
  const [error, setError] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    let cancelled = false
    loader()
      .then((result) => {
        if (!cancelled) setStatus(result)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [loader])

  const upgrade = async () => {
    setRedirecting(true)
    try {
      const result = await checkout()
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }
      // Already subscribed — refresh status.
      setStatus(await loader())
    } finally {
      setRedirecting(false)
    }
  }

  if (compact && status?.subscribed) return null

  return (
    <Card role="region" aria-label="Subscription" className="gap-0 py-4">
      <CardContent className="px-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>Couldn’t load billing status.</AlertDescription>
        </Alert>
      )}
      {!status && !error && (
        <div role="status" aria-label="Loading billing" className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      )}
      {status && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              {status.subscribed ? (
                <>
                  <Badge>{status.plan || 'Storycrat Pro'}</Badge>
                  <p className="font-ui text-xs text-on-surface-variant">Unlimited scripts — thanks for backing the craft.</p>
                </>
              ) : (
                <>
                  <p className="font-ui text-sm font-medium text-on-surface">Free tier</p>
                  <p className="font-ui text-xs text-on-surface-variant">
                    {status.lifetimeScriptCount}/1 script used. Upgrading unlocks unlimited scripts and episodes.
                  </p>
                </>
              )}
            </div>
            {!status.subscribed && (
              <Button
                type="button"
                onClick={() => void upgrade()}
                disabled={redirecting}
                size="sm"
                className="shrink-0"
              >
                {redirecting ? 'Opening checkout…' : 'Upgrade'}
              </Button>
            )}
          </div>
        </>
      )}
      </CardContent>
    </Card>
  )
}

async function defaultFetchStatus(init?: RequestInit): Promise<TierStatusResponse> {
  const response = await fetch('/api/billing/subscription', init)
  if (!response.ok) throw new Error(String(response.status))
  return (await response.json()) as TierStatusResponse
}

async function defaultStartCheckout(init?: RequestInit): Promise<{ checkoutUrl: string | null; alreadySubscribed?: boolean }> {
  const response = await fetch('/api/billing/checkout', { method: 'POST', ...init })
  if (!response.ok) throw new Error(String(response.status))
  return (await response.json()) as { checkoutUrl: string | null; alreadySubscribed?: boolean }
}
