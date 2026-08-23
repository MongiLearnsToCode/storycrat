export type ElementType = 'scene_heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition'

export interface ScriptElement {
  id: string
  position: number
  type: ElementType
  content: string
}

export interface Script {
  id: string
  project_id: string
  episode_id: string | null
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseOrThrow(response: Response): Promise<unknown> {
  if (!response.ok) {
    let detail = ''
    try {
      const body = (await response.json()) as { error?: string }
      detail = body.error ? `: ${body.error}` : ''
    } catch {
      // Non-JSON error body.
    }
    throw new ApiError(`${response.status}${detail}`, response.status)
  }
  return response.json()
}

export async function fetchScript(scriptId: string, init?: RequestInit): Promise<{ script: Script; elements: ScriptElement[] }> {
  const response = await fetch(`/api/scripts/${encodeURIComponent(scriptId)}`, init)
  const parsed = (await parseOrThrow(response)) as { script: Script; elements: ScriptElement[] }
  return parsed
}

/** Full ordered replacement — positions normalize server-side. */
export async function saveScriptElements(scriptId: string, elements: Array<Pick<ScriptElement, 'type' | 'content'>>, init?: RequestInit): Promise<void> {
  const response = await fetch(`/api/scripts/${encodeURIComponent(scriptId)}/elements`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elements }),
    ...init,
  })
  await parseOrThrow(response)
}

export async function updateScriptElement(
  scriptId: string,
  elementId: string,
  patch: Partial<Pick<ScriptElement, 'type' | 'content'>>,
  init?: RequestInit
): Promise<void> {
  const response = await fetch(`/api/scripts/${encodeURIComponent(scriptId)}/elements/${encodeURIComponent(elementId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
    ...init,
  })
  await parseOrThrow(response)
}
