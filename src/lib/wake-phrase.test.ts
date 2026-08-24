import { describe, expect, it } from 'vitest'
import { findWakePhrase, splitAtWakePhrase } from './wake-phrase-detector'
import { parseCommand } from './voice-command-parser'

describe('wake-phrase detection (Task 3.5)', () => {
  it('fires on "Partner," followed by a command', () => {
    const hit = findWakePhrase('Partner, new scene')
    expect(hit).not.toBeNull()
  })

  it('fires without punctuation when directly followed by a command keyword', () => {
    expect(findWakePhrase('partner new scene')).not.toBeNull()
  })

  it('does NOT fire when "partner" is ordinary content — "cut to the chase" case', () => {
    // Dictated dialogue containing command-like words must never become a command.
    const text = 'She told me to cut to the chase and my partner said hi there friend'
    const split = splitAtWakePhrase(text)
    expect(split).toBeNull()
  })

  it('does not fire on possessive or compound mentions', () => {
    expect(splitAtWakePhrase('my partners laptop was stolen by the villain')).toBeNull()
  })

  it('splits mid-buffer: pre-phrase content is preserved, post-phrase routed to commands', () => {
    const buffer = 'Rain hammered the windows all night long Partner, delete last line'
    const split = splitAtWakePhrase(buffer)

    expect(split).not.toBeNull()
    expect(split!.content).toBe('Rain hammered the windows all night long')
    expect(split!.commandText).toBe('delete last line')

    // The content half parses as an ordinary command? It must NOT.
    expect(parseCommand(split!.content)).toBeNull()
  })

  it('handles the phrase at buffer start', () => {
    const split = splitAtWakePhrase('Partner, new scene INT. BAR - NIGHT')
    expect(split!.content).toBe('')
    expect(parseCommand(split!.commandText)).toMatchObject({ kind: 'new_scene' })
  })
})

describe('voice command parser (Tasks 3.6–3.7)', () => {
  it.each([
    ['new scene', { kind: 'new_scene' }],
    ['new scene int. bar - night', { kind: 'new_scene', heading: 'int. bar - night' }],
    ['cut to', { kind: 'transition' }],
    ['cut to: the river', { kind: 'transition', destination: 'the river' }],
    ['action he slams the door', { kind: 'insert_action', text: 'he slams the door' }],
    ['delete last line', { kind: 'delete_last_line' }],
    ['remove the last element', { kind: 'delete_last_line' }],
    ['delete last scene', { kind: 'delete_last_scene' }],
    ['change last line to dialogue', { kind: 'retag_last', to: 'dialogue' }],
    ['make the last element scene heading', { kind: 'retag_last', to: 'scene_heading' }],
    ['rename scene heading to int. car - moving', { kind: 'set_scene_heading', text: 'int. car - moving' }],
  ])('%s', (input, expected) => {
    expect(parseCommand(input)).toMatchObject(expected)
  })

  it.each([
    'please write me three pages about nothing',
    'fly me to the moon',
    '',
  ])('returns null (not understood) for %j', (input) => {
    expect(parseCommand(input)).toBeNull()
  })
})
