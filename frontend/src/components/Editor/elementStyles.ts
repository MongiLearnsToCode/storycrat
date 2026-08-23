import type { ElementType } from '@/lib/api'

/**
 * Shared visual formatting for script elements — single source of truth so
 * the read-only renderer (ElementRenderer) and the editable inputs
 * (ScreenplayEditor) format identically. Indents are industry-standard
 * (DESIGN.md spacing tokens): action 0", character 2", dialogue 1",
 * parenthetical 1.5"; transitions flush right.
 */
export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  scene_heading: 'SCENE',
  action: 'ACT',
  character: 'CHAR',
  dialogue: 'DIAL',
  parenthetical: 'PAR',
  transition: 'TRANS',
}

export const ELEMENT_STYLES: Record<ElementType, string> = {
  scene_heading: 'font-bold uppercase mt-6',
  action: 'mt-4',
  character: 'ml-[2in] uppercase mt-4',
  dialogue: 'ml-[1in] mr-[1.5in]',
  parenthetical: 'ml-[1.5in] mr-[2in] italic',
  transition: 'text-right font-bold uppercase mt-4',
}

/**
 * What a new element becomes when created from the end of another,
 * following conventional screenplay flow.
 */
export const NEXT_TYPE: Record<ElementType, ElementType> = {
  scene_heading: 'action',
  action: 'character',
  character: 'dialogue',
  dialogue: 'character',
  parenthetical: 'dialogue',
  transition: 'scene_heading',
}
