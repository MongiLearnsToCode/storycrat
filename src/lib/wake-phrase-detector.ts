/**
 * "Partner" wake-phrase detection (Tasks 3.5, PRD Req 15–16).
 *
 * Runs on EVERY finalized transcript segment inside the session DO — always
 * BEFORE the Alarms-driven commit touches D1. If a wake phrase lands
 * mid-buffer, the caller splits at it: pre-phrase text is ordinary dictated
 * content; only the post-phrase text may become a command.
 *
 * False-positive discipline: "partner" only wakes as a standalone token
 * (optionally trailed by punctuation). Dialogue like "my partner said hi"
 * contains "partner said…" — "said" is not punctuation, so the phrase does
 * NOT fire unless followed by a known command keyword (Task 3.6 grammar),
 * which is how deliberate invocations without a pause still work.
 */

export interface WakePhraseHit {
  /** Index of the word "partner" in the scanned text. */
  start: number
  /** Index just past the trailing punctuation (start of command text). */
  commandStart: number
}

const WAKE_TOKEN = /\bpartner\b/gi
/** Punctuation right after "partner," e.g. "Partner, new scene." */
const TRAILING_PUNCT = /^\s*[,.;:!?\u2014-]\s*/

export const COMMAND_KEYWORDS = [
  'new',
  'scene',
  'cut',
  'action',
  'delete',
  'remove',
  'change',
  'make',
  'rename',
  'heading',
] as const

function startsWithCommandKeyword(text: string): boolean {
  return COMMAND_KEYWORDS.some((kw) => text.toLowerCase().startsWith(kw))
}

/**
 * Finds the FIRST wake-phrase occurrence that qualifies as a command
 * invocation: "partner" followed either by punctuation ("Partner, cut to:")
 * or directly by a command keyword ("partner new scene").
 */
export function findWakePhrase(text: string): WakePhraseHit | null {
  WAKE_TOKEN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = WAKE_TOKEN.exec(text)) !== null) {
    const afterIndex = match.index + match[0].length
    const rest = text.slice(match.index + 'partner'.length)

    const punct = rest.match(TRAILING_PUNCT)
    if (punct) {
      return { start: match.index, commandStart: match.index + 'partner'.length + punct[0].length }
    }

    const following = text.slice(afterIndex).trimStart()
    if (following && startsWithCommandKeyword(following)) {
      return { start: match.index, commandStart: afterIndex }
    }
  }
  return null
}

export interface WakeSplit {
  /** Ordinary dictated content preceding the phrase (committed verbatim). */
  content: string
  /** Text after the wake phrase, routed to the command parser. */
  commandText: string
}

/**
 * Splits buffered text at the first qualifying wake phrase. Returns null
 * when no phrase is present — the caller proceeds with a normal commit of
 * the whole buffer.
 */
export function splitAtWakePhrase(bufferText: string): WakeSplit | null {
  const hit = findWakePhrase(bufferText)
  if (!hit) return null
  return {
    content: bufferText.slice(0, hit.start).replace(/\s+$/, ''),
    commandText: bufferText.slice(hit.commandStart).trim(),
  }
}
