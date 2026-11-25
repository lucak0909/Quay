import { describe, expect, it } from 'vitest'
import { buildGuidance, buildUserPrompt } from './prompt'

describe('buildUserPrompt', () => {
  it('leaves out the context block when there is no guidance', () => {
    const prompt = buildUserPrompt('notes', 10)
    expect(prompt).not.toContain('<about_me>')
    expect(prompt).toContain('<notes>\nnotes\n</notes>')
  })

  it('puts the student context before the notes', () => {
    const prompt = buildUserPrompt('notes', 10, 'A-level biology')
    expect(prompt.indexOf('<about_me>\nA-level biology\n</about_me>')).toBeLessThan(prompt.indexOf('<notes>'))
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
