import { useState } from 'react'
import { requestMagicLink } from '@/lib/api'

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
      <div className="w-full max-w-sm rounded-lg border border-outline-variant bg-container-low p-8">
        <h1 className="text-center font-ui text-xl font-semibold text-on-surface">Sign in to Storycrat</h1>
        <p className="mt-2 text-center font-ui text-[13px] leading-relaxed text-on-surface-variant">
          We&rsquo;ll email you a one-time link. No password to remember.
        </p>

        {state !== 'sent' ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              aria-label="Email address"
              className="w-full rounded-md border border-outline-variant bg-container-lowest px-3 py-2 font-ui text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-creative-spark-blue"
            />
            <button
              type="submit"
              disabled={state === 'sending'}
              className="w-full rounded-md border border-creative-spark-blue bg-midnight-charcoal px-3 py-2 font-ui text-sm font-medium text-on-surface disabled:opacity-40"
            >
              {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {error && (
              <p role="alert" className="font-ui text-xs text-error">
                Couldn&rsquo;t send the link right now — try again in a moment.
              </p>
            )}
          </form>
        ) : (
          <div className="mt-6 space-y-3 text-center">
            <p role="status" className="font-ui text-sm text-on-surface">
              Check your inbox — the link works once and expires in 15 minutes.
            </p>
            {devLink && (
              <p className="font-ui text-xs text-on-surface-variant">
                Dev mode: <a data-testid="dev-link" href={devLink} className="text-creative-spark-blue underline">open your link</a>
              </p>
            )}
            <button
              type="button"
              onClick={onSignedIn}
              className="font-ui text-xs text-creative-spark-blue underline underline-offset-2"
            >
              I&rsquo;ve signed in — continue
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
