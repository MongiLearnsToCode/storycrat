import type { Env } from './types'
import { hasSecret } from './lib/secrets'

// Durable Object classes must be exported from the entry module.
export { SessionState } from './durable-objects/SessionState'

import { registerProjectRoutes } from './routes/projects'
import { registerScriptRoutes } from './routes/scripts'

export type { Env }

export interface RouteContext {
  request: Request
  env: Env
  params: Record<string, string>
  url: URL
}

export type Handler = (ctx: RouteContext) => Response | Promise<Response>

interface Route {
  method: string
  pattern: RegExp
  paramNames: string[]
  handler: Handler
}

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' }

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } })
}

export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status)
}

/**
 * Minimal path compiler: `:param` captures one segment; a trailing `*name`
 * captures the rest of the path (slashes included) for object-key routes.
 */
export function compilePath(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = []
  const segments = pattern.split('/').filter((s) => s.length > 0)
  let regexSource = ''

  segments.forEach((segment, i) => {
    if (segment.startsWith(':')) {
      paramNames.push(segment.slice(1))
      regexSource += '([^/]+)'
    } else if (segment === '*' && i === segments.length - 1) {
      paramNames.push('wildcard')
      regexSource += '(.*)'
    } else {
      regexSource += segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    if (i < segments.length - 1) regexSource += '/'
  })

  return { regex: new RegExp(`^/${regexSource}/?$`), paramNames }
}

export class Router {
  private routes: Route[] = []

  add(method: string, path: string, handler: Handler): this {
    const { regex, paramNames } = compilePath(path)
    this.routes.push({ method, pattern: regex, paramNames, handler })
    return this
  }

  get(path: string, handler: Handler): this {
    return this.add('GET', path, handler)
  }

  post(path: string, handler: Handler): this {
    return this.add('POST', path, handler)
  }

  put(path: string, handler: Handler): this {
    return this.add('PUT', path, handler)
  }

  patch(path: string, handler: Handler): this {
    return this.add('PATCH', path, handler)
  }

  delete(path: string, handler: Handler): this {
    return this.add('DELETE', path, handler)
  }

  async handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    for (const route of this.routes) {
      if (route.method !== request.method) continue

      const match = route.pattern.exec(url.pathname)
      if (!match) continue

      const params: Record<string, string> = {}
      route.paramNames.forEach((name, i) => {
        const value = match[i + 1]
        if (value !== undefined) {
          params[name] = decodeURIComponent(value)
        }
      })

      try {
        return await route.handler({ request, env, params, url })
      } catch (error) {
        console.error(`Handler failed: ${request.method} ${url.pathname}`, error)
        return errorResponse('Internal server error', 500)
      }
    }

    return errorResponse('Not found', 404)
  }
}

export function createRouter(): Router {
  const router = new Router()

  const healthHandler = (_ctx: RouteContext) => {
    // Ops visibility without leaking anything: booleans only.
    return jsonResponse({
      status: 'ok',
      service: 'storycrat',
      timestamp: new Date().toISOString(),
      secrets: {
        groq: hasSecret(_ctx.env, 'GROQ_API_KEY'),
        deepgram: hasSecret(_ctx.env, 'DEEPGRAM_API_KEY'),
        assemblyai: hasSecret(_ctx.env, 'ASSEMBLYAI_API_KEY'),
        resend: hasSecret(_ctx.env, 'RESEND_API_KEY'),
        polar: hasSecret(_ctx.env, 'POLAR_ACCESS_TOKEN'),
      },
    })
  }

  // Bare /health for infrastructure probes; all application routes live
  // under /api so the frontend's dev-proxy paths match production exactly.
  router.get('/health', healthHandler)
  router.get('/api/health', healthHandler)

  registerProjectRoutes(router)
  registerScriptRoutes(router)

  return router
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return createRouter().handle(request, env)
  },
} satisfies ExportedHandler<Env>
