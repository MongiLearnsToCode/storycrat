/** Screenplay element types shared by editor, classifier, and export (PRD §7). */
export const ELEMENT_TYPES = ['scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'] as const

export type ElementType = (typeof ELEMENT_TYPES)[number]
