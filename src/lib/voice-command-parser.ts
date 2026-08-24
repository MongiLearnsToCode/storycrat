import type { ElementType } from './element-types'

/**
 * Voice command parsing (Tasks 3.6–3.7). Input is the text following a
 * qualifying "Partner" wake phrase — content spoken WITHOUT the phrase never
 * reaches this parser (PRD Req 15). Anything that does not match a known
 * pattern returns null, which the caller surfaces as "not understood"
 * (PRD Req 18) rather than guessing.
 */

export type VoiceCommand =
  | { kind: 'new_scene'; heading?: string }
  | { kind: 'transition'; destination?: string }
  | { kind: 'insert_action'; text: string }
  | { kind: 'delete_last_line' }
  | { kind: 'delete_last_scene' }
  | { kind: 'retag_last'; to: ElementType }
  | { kind: 'set_scene_heading'; text: string }

export const ELEMENT_WORDS: Record<string, ElementType> = {
  'scene heading': 'scene_heading',
  scene: 'scene_heading',
  action: 'action',
  character: 'character',
  dialogue: 'dialogue',
  parenthetical: 'parenthetical',
  transition: 'transition',
}

/** Parses a post-wake-phrase utterance. null = not recognized (never guessed). */
export function parseCommand(raw: string): VoiceCommand | null {
  const text = raw.trim().replace(/\s+/g, ' ')
  if (!text) return null
  const lower = text.toLowerCase().replace(/[.!]+$/, '')

  // --- Formatting commands (Task 3.6) ---
  let m = lower.match(/^new scene(?: heading)?(?: (?:titled|called)? ?(?:"(.+)"|(.*)))?$/)
  if (m) return { kind: 'new_scene', heading: (m[1] ?? m[2])?.trim() || undefined }

  m = lower.match(/^cut to:? ?(.*)$/)
  if (m) return { kind: 'transition', destination: m[1]?.trim() || undefined }

  m = lower.match(/^(?:new action|action)[: ](.+)$/)
  if (m && m[1] !== undefined) return { kind: 'insert_action', text: m[1].trim() }

  // --- Editing commands (Task 3.7) ---
  m = lower.match(/^(?:delete|remove) (?:the )?(?:last )?(line|element)s?$/)
  if (m) return { kind: 'delete_last_line' }

  m = lower.match(/^(?:delete|remove) (?:the )?last scene$/)
  if (m) return { kind: 'delete_last_scene' }

  m = lower.match(
    /^(?:change|make) (?:the )?last (line|element)(?: to(?: a| an?)?)? (.+)$/
  )
  const word = m?.[2]
  if (m && word && ELEMENT_WORDS[word]) return { kind: 'retag_last', to: ELEMENT_WORDS[word] }

  m = lower.match(/^(?:rename|change) (?:the )?(?:last )?scene heading to (.+)$/)
  if (m && m[1] !== undefined) return { kind: 'set_scene_heading', text: m[1].trim() }

  return null
}

export function describeCommand(command: VoiceCommand): string {
  switch (command.kind) {
    case 'new_scene':
      return command.heading ? `New scene: ${command.heading}` : 'New scene'
    case 'transition':
      return command.destination ? `Cut to ${command.destination}` : 'Cut to'
    case 'insert_action':
      return `Action added`
    case 'delete_last_line':
      return 'Last line deleted'
    case 'delete_last_scene':
      return 'Last scene deleted'
    case 'retag_last':
      return `Last line changed to ${command.to}`
    case 'set_scene_heading':
      return `Scene heading set`
  }
}
