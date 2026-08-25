import { useState } from 'react'
import { requestMagicLink } from '@/lib/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Sign-in screen (Task 5.1 UI): email -> magic link. Calm and minimal
 * (midnight surface, Geist UI, creative-spark-blue focus states).
 */
export interface SignInScreenProps {
  onSignedIn: () => void
  requestLinkFn?: (email: string) => Promise<{ ok: boolean; devLink?: string }>
}

export default function SignInScreen({ onSignedIn, requestLinkFn }: SignInScreenProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [devLink, setDevLink] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.includes('@') || state === 'sending') return
    setState('sending')
    setError(false)
    try {
      const result = await (requestLinkFn ?? requestMagicLink)(email.trim())
      setDevLink(result.devLink ?? null)
      setState('sent')
    } catch {
      setError(true)
      setState('idle')
    }
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6">
      <Card className="w-full max-w-sm gap-0 py-8">
        <CardHeader className="text-center">
          <CardTitle className="font-ui text-xl">Sign in to Storycrat</CardTitle>
          <CardDescription className="font-ui text-[13px] leading-relaxed">
            We&rsquo;ll email you a one-time link. No password to remember.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {state !== 'sent' ? (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sign-in-email">Email address</Label>
                <Input
                  id="sign-in-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                />
              </div>
              <Button type="submit" disabled={state === 'sending'} className="w-full">
                {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
              </Button>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>Couldn&rsquo;t send the link right now — try again in a moment.</AlertDescription>
                </Alert>
              )}
            </form>
          ) : (
            <div className="mt-6 space-y-3 text-center">
              <p role="status" className="font-ui text-sm text-on-surface">
                Check your inbox — the link works once and expires in 15 minutes.
              </p>
              {devLink && (
                <div className="flex items-center justify-center gap-1 font-ui text-xs text-on-surface-variant">
                  <span>Dev mode:</span>
                  <Button asChild variant="link" size="xs" className="px-0">
                    <a data-testid="dev-link" href={devLink}>open your link</a>
                  </Button>
                </div>
              )}
              <Button type="button" variant="link" size="sm" onClick={onSignedIn}>
                I&rsquo;ve signed in — continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
