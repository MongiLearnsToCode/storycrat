import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { describe, expect, it } from 'vitest'
import { generateScriptPdf, wrapElement } from './pdf-export'
import { COURIER_PRIME_REGULAR_B64 } from './fonts/courier-prime.generated'

const sample = [
  { type: 'scene_heading' as const, content: 'Int. Dispatch - Night' },
  { type: 'action' as const, content: 'Rain hammers the windows. Mara pushes through the door, radio in hand, coat soaked through.' },
  { type: 'character' as const, content: 'Mara' },
  { type: 'parenthetical' as const, content: '(into radio)' },
  { type: 'dialogue' as const, content: "Unit two, we're moving. I want the block sealed before he reaches the river." },
  { type: 'transition' as const, content: 'Cut to:' },
]

describe('generateScriptPdf (Workers runtime verification)', () => {
  it('runs inside workerd and produces a valid multi-element PDF', async () => {
    const result = await generateScriptPdf('Test Script', sample)

    const header = String.fromCharCode(...result.bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
    expect(result.bytes.length).toBeGreaterThan(1000)
    expect(result.pageCount).toBe(1)
  })

  it('produces industry-standard page geometry', async () => {
    const result = await generateScriptPdf('Geometry Test', sample)
    const doc = await PDFDocument.load(result.bytes)
    const page = doc.getPages()[0]
    if (!page) throw new Error('No pages in PDF')

    expect(page.getWidth()).toBe(612) // 8.5"
    expect(page.getHeight()).toBe(792) // 11"
  })

  it('paginates long scripts', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      type: 'action' as const,
      content: `Beat ${i + 1}: The story continues with relentless forward motion and no sign of stopping soon at all.`,
    }))
    const result = await generateScriptPdf('Long Script', many)
    expect(result.pageCount).toBeGreaterThan(1)

    const doc = await PDFDocument.load(result.bytes)
    expect(doc.getPageCount()).toBe(result.pageCount)
  })

  it('sets document metadata from the script title', async () => {
    const result = await generateScriptPdf('Font Test', sample)
    const doc = await PDFDocument.load(result.bytes)
    expect(doc.getTitle()).toBe('Font Test')
  })

  it('handles empty scripts without crashing', async () => {
    const result = await generateScriptPdf('Empty', [])
    expect(result.bytes[0]).toBe(0x25) // '%'
    expect(result.pageCount).toBe(1)
  })
})

describe('wrapElement', () => {
  const embedTestFont = async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const fontBytes = Uint8Array.from(atob(COURIER_PRIME_REGULAR_B64), (c) => c.charCodeAt(0))
    return doc.embedFont(fontBytes, { subset: true })
  }

  it('wraps long action lines to the six-inch column using real font metrics', async () => {
    const font = await embedTestFont()

    const longLine = 'The '.repeat(40).trim()
    const lines = wrapElement(longLine, 'action', font, 12)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(432) // 6"
    }
  })

  it('hard-splits a single word that exceeds the whole column', async () => {
    const font = await embedTestFont()

    const monster = 'X'.repeat(120)
    const lines = wrapElement(monster, 'dialogue', font, 12)
    // Dialogue column: 612 - 108 (left) - 72 (right margin) - 72 (right indent) = 360pt
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(360)
    }
    expect(lines.join('')).toBe(monster)
  })
})
