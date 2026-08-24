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
        },
      },
    }),
  ],
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
