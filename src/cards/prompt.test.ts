import { describe, expect, it } from 'vitest'
import { buildGuidance, buildUserPrompt } from './prompt'

const detail = { instruction: 'The main point of each section.', maxCards: 12 }

describe('buildUserPrompt', () => {
  it('leaves out the context block when there is no guidance', () => {
    const prompt = buildUserPrompt('notes', detail)
    expect(prompt).not.toContain('<about_me>')
    expect(prompt).toContain('<notes>\nnotes\n</notes>')
  })

  it('puts the student context before the notes', () => {
    const prompt = buildUserPrompt('notes', detail, 'A-level biology')
    expect(prompt.indexOf('<about_me>\nA-level biology\n</about_me>')).toBeLessThan(prompt.indexOf('<notes>'))
  })

  it('asks for a level of detail, lets the AI pick the number, and caps it', () => {
    const prompt = buildUserPrompt('notes', detail)
    expect(prompt).toContain('The main point of each section.')
    expect(prompt).toContain('Decide how many cards')
    expect(prompt).toContain('never more than 12')
  })

  it('says which part of a longer document this is', () => {
    expect(buildUserPrompt('notes', detail, '', { index: 1, total: 4 })).toContain('part 2 of 4')
    expect(buildUserPrompt('notes', detail, '', { index: 0, total: 1 })).not.toContain('part 1 of 1')
  })
})

describe('buildGuidance', () => {
  it('combines free text with chosen focus options', () => {
    expect(buildGuidance('  Exam on Friday ', ['definitions', 'exam'])).toBe(
      'Exam on Friday\nPrioritise key terms and their definitions.\nPhrase questions the way an exam would ask them.',
    )
  })

  it('ignores unknown focus ids and empty text', () => {
    expect(buildGuidance('', ['nope'])).toBe('')
  })
})
