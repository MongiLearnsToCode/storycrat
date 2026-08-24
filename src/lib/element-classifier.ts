import { runLlm, LlmError } from './llm-router'
import { ELEMENT_TYPES, type ElementType } from './element-types'
import type { Env } from '../types'

/**
 * Batched element-type classification (Task 3.4, PRD §7).
 *
 * One LLM call per committed buffer — never per word — to respect Groq's
 * rate limits. On any failure the text is preserved as action lines:
 * a classification outage must never destroy dictated content.
 */

export interface ClassifiedElement {
  type: ElementType
  content: string
}

const SYSTEM_PROMPT = `You format raw screenplay dictation into typed elements. You will receive dictated text. Return ONLY a JSON array; each item is {"type":"...","content":"..."} where type is exactly one of: scene_heading, action, character, dialogue, parenthetical, transition.
Rules:
- Preserve the author's words verbatim in "content". Never rewrite, fix grammar, or invent content.
- Scene headings UPPERCASE, usually start with INT. or EXT.
- A character name on its own line precedes dialogue.
- Parentheticals are short (whispering) asides.
- Transitions are CUT TO:, FADE OUT., etc.
- If unsure, use action.
Output JSON only.`

export async function classifyBufferedText(env: Env, buffer: string): Promise<ClassifiedElement[]> {
  try {
    const response = await runLlm(
      env,
      'structuring',
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Dictated text:\n"""\n${buffer}\n"""` },
      ],
      { temperature: 0, maxTokens: 2048 }
    )

    const jsonStart = response.indexOf('[')
    const jsonEnd = response.lastIndexOf(']')
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) throw new Error('no JSON array in response')

    const parsed = JSON.parse(response.slice(jsonStart, jsonEnd + 1)) as unknown
    if (!Array.isArray(parsed)) throw new Error('response is not an array')

    const elements: ClassifiedElement[] = []
    for (const item of parsed) {
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ClassifiedElement).type === 'string' &&
        ELEMENT_TYPES.includes((item as ClassifiedElement).type as ElementType) &&
        typeof (item as ClassifiedElement).content === 'string'
      ) {
        elements.push({ type: (item as ClassifiedElement).type as ElementType, content: (item as ClassifiedElement).content })
      }
    }
    // If the model mangled everything, keep the words as actions below.
    if (elements.length === 0) throw new Error('no valid elements parsed')
    return elements
  } catch (error) {
    const reason = error instanceof LlmError ? `LLM error (${error.status ?? 'n/a'})` : error instanceof Error ? error.message : 'unknown'
    console.warn(`Classification fell back to plain action lines: ${reason}`)
    return fallback(buffer)
  }
}

function fallback(buffer: string): ClassifiedElement[] {
  return buffer
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ type: 'action' as ElementType, content: line }))
}
