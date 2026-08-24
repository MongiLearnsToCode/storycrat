import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.jsonc' },
      miniflare: {
        // Test-only values for secret/vars that are otherwise set outside
        // tests (`wrangler secret put` / dashboard config). The AI and
        // Vectorize bindings are replaced with inert fakes: local dev cannot
        // reach them, and unit/integration tests stub their call sites.
        bindings: {
          PDF_SIGNING_SECRET: 'test-pdf-signing-secret',
          GROQ_API_KEY: 'test-groq-key',
          GROQ_ZDR_CONFIRMED: 'true',
          RESEND_API_KEY: 'test-resend-key',
        },
        // Third-party outbound calls (Resend, Groq, Deepgram) succeed in
        // tests without touching the real network. Tests assert against our
        // own state (KV/D1) rather than provider payloads.
        outboundService: () => Promise.resolve(new Response('{}', { status: 200 })),
      },
    }),
  ],
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
