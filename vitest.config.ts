import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        // Test-only values for secret bindings that are otherwise set via
        // `wrangler secret put` outside tests.
        bindings: {
          PDF_SIGNING_SECRET: 'test-pdf-signing-secret',
        },
      },
    }),
  ],
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
