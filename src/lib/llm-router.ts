/**
 * Provider-agnostic LLM routing layer (PRD §7).
 *
 * All model calls in Storycrat go through this module. Feature code never
 * names a provider or model — it declares a *task type* ("structuring" for
 * Writing mode, "critique" for Conversation mode / Get Notes) and the router
 * resolves it to whatever provider/model is configured. Swapping Conversation
 * mode off Groq's free tier later must not require touching feature code.
 *
 * Security (security-doc.md):
 * - Runs exclusively in the Worker; API keys are Wrangler secrets, never
 *   shipped to or held by the frontend.
 * - Rate-limit responses are surfaced as a typed `LlmRateLimitError` so UI
 *   states (e.g. "AI rate limit reached", Task 3.12) are distinguishable
 *   from generic failures rather than collapsed into one error toast.
 */
import type { Env } from '../types'

export type LlmTaskType = 'structuring' | 'critique'

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface LlmRequestOptions {
  /** Upper bound on generated tokens. Providers clamp if their max is lower. */
  maxTokens?: number
  /** Sampling temperature (0 = deterministic structuring, higher = critique). */
  temperature?: number
  /** Abort signal propagated from the caller (e.g. request cancellation). */
  signal?: AbortSignal
  /** Overrides the default per-request deadline (30s); useful for long critique generations and tests. */
  timeoutMs?: number
}

/** Per-task-type model configuration, sourced from environment variables so models can be swapped without touching feature code. */
export interface LlmModelConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export class LlmError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'LlmError'
    this.status = status
  }
}

/** Distinguishes provider-side rate limiting (HTTP 429) so callers can render the dedicated "AI rate limit reached" state instead of a generic failure. */
export class LlmRateLimitError extends LlmError {
  constructor(message = 'AI rate limit reached') {
    super(message, 429)
    this.name = 'LlmRateLimitError'
  }
}

/**
 * Launch-blocking guard (security-doc.md § Third-Party Data Exposure):
 * thrown when an LLM call is attempted before Zero Data Retention has been
 * confirmed in Groq's Data Controls. Failing closed here is deliberate —
 * Storycrat handles unpublished creative IP, so an unattested call is a
 * privacy incident waiting to happen, not a config inconvenience.
 */
export class GroqZdrNotConfirmedError extends LlmError {
  constructor() {
    super(
      'Zero Data Retention is not confirmed for Groq. Enable it in Groq Data Controls, then set GROQ_ZDR_CONFIRMED=true before processing any user content.'
    )
    this.name = 'GroqZdrNotConfirmedError'
  }
}

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * ZDR attestation check — every outbound LLM call passes through this.
 * Only the exact string "true" counts; anything else (unset, "false",
 * "1", "yes") fails closed.
 */
export function zdrConfirmed(env: Env): boolean {
  return env.GROQ_ZDR_CONFIRMED === 'true'
}

/**
 * Resolves the model configuration for a task type.
 *
 * Model names come from env vars (set in wrangler.jsonc `[vars]` or the
 * dashboard), keeping the mapping deploy-configurable. Adding a new provider
 * later means adding a branch here and nothing else.
 */
export function resolveModelConfig(env: Env, taskType: LlmTaskType): LlmModelConfig {
  const apiKey = env.GROQ_API_KEY
  if (!apiKey) {
    throw new LlmError('LLM API key is not configured')
  }

  const model =
    taskType === 'structuring'
      ? (env.LLM_STRUCTURING_MODEL ?? 'llama-3.1-8b-instant')
      : (env.LLM_CRITIQUE_MODEL ?? 'llama-3.1-8b-instant')

  return { baseUrl: 'https://api.groq.com/openai/v1', apiKey, model }
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

async function postChatCompletion(
  config: LlmModelConfig,
  body: Record<string, unknown>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  // Combine caller cancellation with our own timeout.
  const composedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

  let response: Response
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: composedSignal,
    })
  } catch (error) {
    if (signal?.aborted) {
      throw new LlmError('LLM request cancelled')
    }
    if (timeoutSignal.aborted) {
      throw new LlmError(`LLM request timed out after ${timeoutMs}ms`)
    }
    throw new LlmError(`LLM request failed: ${error instanceof Error ? error.message : 'unknown network error'}`)
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new LlmRateLimitError()
    }
    let detail = ''
    try {
      const payload = (await response.json()) as ChatCompletionResponse
      detail = payload.error?.message ? `: ${payload.error.message}` : ''
    } catch {
      // Non-JSON error body; keep detail empty rather than failing harder.
    }
    throw new LlmError(`LLM provider returned ${response.status}${detail}`, response.status)
  }

  return response
}

/**
 * Sends a chat completion request for the given task type and returns the
 * assistant's text content.
 */
export async function runLlm(
  env: Env,
  taskType: LlmTaskType,
  messages: ChatMessage[],
  options: LlmRequestOptions = {}
): Promise<string> {
  if (!zdrConfirmed(env)) {
    throw new GroqZdrNotConfirmedError()
  }

  const config = resolveModelConfig(env, taskType)
  const response = await postChatCompletion(
    config,
    {
      model: config.model,
      messages,
      temperature: options.temperature ?? (taskType === 'structuring' ? 0 : 0.7),
      max_tokens: options.maxTokens ?? 1024,
    },
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal
  )

  const payload = (await response.json()) as ChatCompletionResponse
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new LlmError('LLM provider returned an empty completion')
  }

  return content
}

/** Convenience wrapper: one system message + one user message. */
export async function runLlmSingleTurn(
  env: Env,
  taskType: LlmTaskType,
  systemPrompt: string,
  userContent: string,
  options: LlmRequestOptions = {}
): Promise<string> {
  return runLlm(
    env,
    taskType,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    options
  )
}
