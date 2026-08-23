import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { COURIER_PRIME_BOLD_B64, COURIER_PRIME_REGULAR_B64 } from './fonts/courier-prime.generated'

/**
 * Screenplay PDF generation (Task 2.7) — derives from structured elements
 * (PRD §7: never from a formatted string).
 *
 * Industry-standard page geometry:
 * - 8.5 × 11 in (612 × 792 pt)
 * - Left margin 1.5", right 1" (text width 6"), top 1", bottom 1"
 * - Courier Prime 12pt, single-spaced (12pt leading), 10 chars/inch
 * Per DESIGN.md spacing tokens: action 0", character 2", dialogue 1",
 * parenthetical 1.5"; scene headings uppercase bold; transitions flush right.
 */

export type PdfElementType = 'scene_heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition'

export interface PdfElement {
  type: PdfElementType
  content: string
}

// Points: 72/in.
const PAGE_W = 612
const PAGE_H = 792
const MARGIN_LEFT = 108 // 1.5"
const MARGIN_RIGHT = 72 // 1"
const MARGIN_TOP = 72
const MARGIN_BOTTOM = 72
const FONT_SIZE = 12
const LINE_HEIGHT = 12

const INDENTS_PT: Record<PdfElementType, { left: number; right: number }> = {
  scene_heading: { left: 0, right: 0 },
  action: { left: 0, right: 0 },
  character: { left: 144, right: 144 }, // 2" in, ~2" short of right margin
  dialogue: { left: 72, right: 108 }, // 1" in, ~1.5" short of right
  parenthetical: { left: 108, right: 144 }, // 1.5" in
  transition: { left: 0, right: 0 }, // flush right via alignment
}

/** Extra vertical space before an element, in lines. */
const SPACE_BEFORE_LINES: Record<PdfElementType, number> = {
  scene_heading: 2,
  action: 1,
  character: 1,
  dialogue: 0,
  parenthetical: 0,
  transition: 1,
}

interface Line {
  text: string
  type: PdfElementType
  bold: boolean
  alignRight: boolean
  /** True for the first visual line of an element — spacing-before applies here. */
  first: boolean
}

/**
 * Word-wraps content to the element's usable width using real font metrics.
 * Monospace means we could count chars, but metrics stay correct if the
 * font ever changes.
 */
export function wrapElement(content: string, type: PdfElementType, font: PDFFont, size: number): string[] {
  const indent = INDENTS_PT[type]
  const maxWidth = PAGE_W - MARGIN_LEFT - indent.left - MARGIN_RIGHT - indent.right
  const words = content.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    // A single overlong word goes on its own line and hard-overflow is avoided
    // by character-splitting only when a lone word exceeds the whole width.
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let piece = ''
      for (const ch of word) {
        if (font.widthOfTextAtSize(piece + ch, size) > maxWidth && piece) {
          lines.push(piece)
          piece = ch
        } else {
          piece += ch
        }
      }
      current = piece
    } else {
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function buildLines(elements: PdfElement[], regular: PDFFont): Line[] {
  const lines: Line[] = []
  for (const element of elements) {
    const content = element.type === 'scene_heading' || element.type === 'character' || element.type === 'transition'
      ? element.content.toUpperCase()
      : element.content

    const wrapped = wrapElement(content, element.type, regular, FONT_SIZE)
    if (wrapped.length === 0) continue

    wrapped.forEach((text, i) => {
      lines.push({
        text,
        type: element.type,
        bold: element.type === 'scene_heading',
        alignRight: element.type === 'transition',
        first: i === 0,
      })
    })
  }
  return lines
}

export interface ExportResult {
  bytes: Uint8Array
  pageCount: number
}

export async function generateScriptPdf(title: string, elements: PdfElement[]): Promise<ExportResult> {
  const doc = await PDFDocument.create()
  doc.setTitle(title)
  doc.setProducer('Storycrat')
  doc.registerFontkit(fontkit)

  const regular = await doc.embedFont(toBytes(COURIER_PRIME_REGULAR_B64), { subset: true })
  const bold = await doc.embedFont(toBytes(COURIER_PRIME_BOLD_B64), { subset: true })

  const lines = buildLines(elements, regular)

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN_TOP
  let pageNumber = 1
  drawPageNumber(page, pageNumber, bold)

  for (const line of lines) {
    const spaceBeforeLines = line.first ? SPACE_BEFORE_LINES[line.type] : 0
    const advance = LINE_HEIGHT + spaceBeforeLines * LINE_HEIGHT

    if (y - advance < MARGIN_BOTTOM) {
      page = doc.addPage([PAGE_W, PAGE_H])
      pageNumber += 1
      drawPageNumber(page, pageNumber, bold)
      // A page break consumes the spacing-before of the pending line.
      y = PAGE_H - MARGIN_TOP - spaceBeforeLines * LINE_HEIGHT
    } else {
      y -= advance
    }

    if (line.text) {
      const font = line.bold ? bold : regular
      const x = line.alignRight
        ? PAGE_W - MARGIN_RIGHT - font.widthOfTextAtSize(line.text.toUpperCase(), FONT_SIZE)
        : MARGIN_LEFT + INDENTS_PT[line.type].left
      page.drawText(line.alignRight ? line.text.toUpperCase() : line.text, { x, y, size: FONT_SIZE, font, color: rgb(0, 0, 0) })
    }
  }

  const bytes = await doc.save()
  return { bytes, pageCount: pageNumber }
}

function drawPageNumber(page: PDFPage, n: number, bold: PDFFont): void {
  // Industry convention: first page unnumbered; subsequent pages "N." top right.
  if (n === 1) return
  const label = `${n}.`
  page.drawText(label, {
    x: PAGE_W - MARGIN_RIGHT - bold.widthOfTextAtSize(label, FONT_SIZE),
    y: PAGE_H - 36,
    size: FONT_SIZE,
    font: bold,
    color: rgb(0, 0, 0),
  })
}

function toBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
