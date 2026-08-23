#!/usr/bin/env node
/**
 * Regenerates src/lib/fonts/courier-prime.generated.ts from the TTF files in
 * src/assets/fonts. Workers can't import binary files directly, so the fonts
 * are embedded as base64. Run after swapping font files:
 *
 *   node scripts/generate-font-modules.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const fontsDir = path.join(root, 'src/assets/fonts')
const outDir = path.join(root, 'src/lib/fonts')

mkdirSync(outDir, { recursive: true })

const regular = readFileSync(path.join(fontsDir, 'CourierPrime-Regular.ttf')).toString('base64')
const bold = readFileSync(path.join(fontsDir, 'CourierPrime-Bold.ttf')).toString('base64')

// Chunked strings avoid editor/linter pain with single multi-hundred-KB literals.
function chunk(b64) {
  const parts = []
  for (let i = 0; i < b64.length; i += 100) {
    parts.push(`  '${b64.slice(i, i + 100)}'`)
  }
  return `[\n${parts.join(',\n')},\n].join('')`
}

const out = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: Courier Prime (SIL Open Font License 1.1), via scripts/generate-font-modules.mjs.
 */
export const COURIER_PRIME_REGULAR_B64: string = ${chunk(regular)};

export const COURIER_PRIME_BOLD_B64: string = ${chunk(bold)};
`

writeFileSync(path.join(outDir, 'courier-prime.generated.ts'), out)
console.log(`Wrote courier-prime.generated.ts (${(regular.length / 1024).toFixed(0)}KB + ${(bold.length / 1024).toFixed(0)}KB base64)`)
