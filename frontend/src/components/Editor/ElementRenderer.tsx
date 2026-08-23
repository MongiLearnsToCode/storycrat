import { cn } from '@/lib/utils'
import type { ElementType } from '@/lib/api'

/**
 * Renders one typed screenplay element with industry-standard formatting
 * (DESIGN.md: JetBrains Mono 16px / 1.5, strict per-element indents, sharp
 * corners — the page reads as a stack of paper, never as a card).
 *
 * The margin "type label" on hover (e.g. "ACT") makes the AI's classification
 * legible to the writer (DESIGN.md → Components → The Editor) without
 * cluttering the page at rest.
 */
export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  scene_heading: 'SCENE',
  action: 'ACT',
  character: 'CHAR',
  dialogue: 'DIAL',
  parenthetical: 'PAR',
  transition: 'TRANS',
}

const ELEMENT_STYLES: Record<ElementType, string> = {
  // Uppercase bold anchor when scrolling (DESIGN.md typography rules).
  scene_heading: 'font-bold uppercase mt-6',
  action: 'mt-4',
  character: 'ml-[2in] uppercase mt-4',
  dialogue: 'ml-[1in] mr-[1.5in]',
  parenthetical: 'ml-[1.5in] mr-[2in] italic',
  // Transitions sit flush-right per industry convention.
  transition: 'text-right font-bold uppercase mt-4',
}

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
