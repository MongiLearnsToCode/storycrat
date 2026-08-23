import { cn } from '@/lib/utils'
import type { ElementType } from '@/lib/api'
import { ELEMENT_TYPE_LABELS, ELEMENT_STYLES } from './elementStyles'

/**
 * Renders one typed screenplay element with industry-standard formatting
 * (DESIGN.md: JetBrains Mono 16px / 1.5, strict per-element indents, sharp
 * corners — the page reads as a stack of paper, never as a card).
 *
 * The margin "type label" on hover (e.g. "ACT") makes the AI's classification
 * legible to the writer (DESIGN.md → Components → The Editor) without
 * cluttering the page at rest. Used by read-only contexts; the editor
 * renders editable inputs styled identically via elementStyles.ts.
 */
export interface ElementRendererProps {
  type: ElementType
  content: string
  className?: string
}

export default function ElementRenderer({ type, content, className }: ElementRendererProps) {
  return (
    <div data-element-type={type} className={cn('group relative', className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -left-16 -translate-y-1/2 text-xs font-ui text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100"
      >
        {ELEMENT_TYPE_LABELS[type]}
      </span>
      <p className={cn('font-script text-base leading-relaxed text-neutral-900', ELEMENT_STYLES[type])}>
        {/* Scene headings are uppercased by style; content stays as written for fidelity. */}
        {content}
      </p>
    </div>
  )
}
