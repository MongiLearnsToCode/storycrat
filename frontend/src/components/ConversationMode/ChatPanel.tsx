import { useEffect, useRef, useState } from 'react'
import { sendChatMessage, type ChatMessageView } from '@/lib/api'
import ScriptChip from '../ConversationMode/ScriptChip'
import { cn } from '@/lib/utils'

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
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="font-ui text-[13px] font-medium uppercase tracking-wide text-on-surface-variant">Conversation</h2>
        <button
          type="button"
          role="switch"
          aria-checked={ttsEnabled}
          data-testid="tts-toggle"
          onClick={() => setTtsEnabled((v) => !v)}
          title={ttsEnabled ? 'Mute spoken replies' : 'Speak replies aloud'}
          className="font-ui text-sm text-on-surface-variant hover:text-on-surface"
        >
          {ttsEnabled ? '🔊 Voice on' : '🔇 Text only'}
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
        {sending && <p role="status" className="font-ui text-xs text-creative-spark-blue">Thinking…</p>}
        {error && <p role="alert" className="font-ui text-xs text-error">The AI is unavailable — try again shortly.</p>}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 border-t border-slate-800 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Push on a scene, a line, a choice…"
          aria-label="Message"
          className="flex-1 rounded-md border border-outline-variant bg-container-lowest px-3 py-2 font-ui text-sm text-on-surface outline-none focus:border-creative-spark-blue"
        />
        <button type="submit" disabled={sending || !input.trim()} className="rounded-md border border-creative-spark-blue bg-midnight-charcoal px-3 py-2 font-ui text-sm font-medium text-on-surface disabled:opacity-40">
          Send
        </button>
      </form>
    </section>
  )
}
