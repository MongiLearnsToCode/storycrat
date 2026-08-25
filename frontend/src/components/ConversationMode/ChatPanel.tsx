import { useEffect, useRef, useState } from 'react'
import { sendChatMessage, type ChatMessageView } from '@/lib/api'
import ScriptChip from '../ConversationMode/ScriptChip'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'

/**
 * Conversation mode chat (Task 4.1 + 4.4 + 4.7): text chat scoped to the
 * current project/episode with scroll-back, script-grounded visual
 * distinction, and browser speechSynthesis playback of assistant replies
 * behind an explicit text-only toggle.
 */
export interface ChatPanelProps {
  projectId: string
  episodeId?: string
  /** Episode currently open in the editor — drives cross-episode chip tags. */
  currentEpisodeId?: string | null
  sendMessage?: typeof sendChatMessage
}

export default function ChatPanel({ projectId, episodeId, currentEpisodeId = null, sendMessage = sendChatMessage }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const conversationId = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages.length])

  // Stop any ongoing speech when leaving.
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const speak = (text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  }

  const submit = async () => {
    const question = input.trim()
    if (!question || sending) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: question, citations: [] }])
    setSending(true)
    setError(false)

    try {
      const result = await sendMessage(projectId, {
        question,
        episodeId,
        conversationId: conversationId.current ?? undefined,
      })
      conversationId.current = result.conversationId
      setMessages((prev) => [...prev, result.reply])
      speak(result.reply.content)
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <section aria-label="Conversation" className="flex h-full flex-col bg-container-low">
      <header className="flex items-center justify-between px-4 py-3">
        <h2 className="font-ui text-[13px] font-medium uppercase tracking-wide text-on-surface-variant">Conversation</h2>
        <div className="flex items-center gap-2">
          <Switch
            id="spoken-replies"
            checked={ttsEnabled}
            onCheckedChange={setTtsEnabled}
            data-testid="tts-toggle"
            aria-label="Spoken replies"
          />
          <Label htmlFor="spoken-replies" className="text-xs text-on-surface-variant">
            {ttsEnabled ? 'Voice on' : 'Text only'}
          </Label>
        </div>
      </header>
      <Separator />

      <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-3 px-4 py-4">
        {messages.length === 0 && (
          <p className="font-ui text-sm text-on-surface-variant">
            Ask about this material — structure, motivation, dialogue. Your AI partner reads what you wrote and pushes back honestly.
          </p>
        )}
        {messages.map((message, i) => (
          <div
            key={i}
            data-grounded={message.role === 'assistant' && message.citations.length > 0 ? 'true' : undefined}
            className={cn('max-w-[90%] rounded-lg px-3 py-2 font-ui text-[15px] leading-relaxed', message.role === 'user'
              ? 'ml-auto bg-container-high text-on-surface'
              : message.citations.length > 0
                ? 'mr-auto border border-creative-spark-blue/40 border-l-2 border-l-creative-spark-blue bg-creative-spark-blue/5 text-on-surface'
                : 'mr-auto bg-container text-on-surface border border-outline-variant/50')}
          >
            {message.role === 'assistant' && message.citations.length > 0 && (
              <p className="mb-1 font-ui text-[11px] uppercase tracking-wide text-creative-spark-blue">
                Grounded in your script
              </p>
            )}
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.citations.length > 0 && (
              <span className="mt-2 flex flex-wrap gap-1">
                {message.citations.map((citation) => (
                  <ScriptChip key={`${citation.scriptId}:${citation.sceneIndex}`} citation={citation} currentEpisodeId={currentEpisodeId} />
                ))}
              </span>
            )}
          </div>
        ))}
        {sending && (
          <div role="status" aria-label="Thinking" className="space-y-2">
            <Skeleton className="h-3 w-24 bg-creative-spark-blue/20" />
            <Skeleton className="h-14 w-4/5 bg-creative-spark-blue/10" />
          </div>
        )}
        {error && (
          <Alert variant="warning">
            <AlertDescription>The AI is unavailable — try again shortly.</AlertDescription>
          </Alert>
        )}
        <div ref={bottomRef} />
      </div>
      </ScrollArea>

      <Separator />
      <form
        className="flex gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Push on a scene, a line, a choice…"
          aria-label="Message"
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          Send
        </Button>
      </form>
    </section>
  )
}
