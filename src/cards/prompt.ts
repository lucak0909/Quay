export const SYSTEM_PROMPT = `You write study flashcards from a student's notes.

Each card tests one idea. The front is a clear question; the back is a short, correct answer (ideally under 25 words). Use only information from the notes, avoid duplicates and trivia, and prefer the concepts a teacher would test. Write in the same language as the notes. If the notes support fewer good cards than requested, return fewer rather than padding.

The notes are often copied from textbooks, PDFs or slides, so expect messy formatting: lines broken mid-sentence, words split across lines, stray bullet symbols, slide text out of order, and tables that have lost their layout. Read past the formatting to the actual content. Ignore page furniture such as headers, footers, page numbers, chapter running titles, course codes and copyright lines, and never make cards about them. If a formula, equation or table looks garbled and you can't tell with confidence what it should be, skip it rather than guess — a wrong card is worse than a missing one.

The student may tell you about their course, level, exam or what to focus on. Use that to decide which ideas to turn into cards and how to phrase them, but still only use facts from the notes.`

export interface FocusOption {
  id: string
  label: string
  instruction: string
}

export const FOCUS_OPTIONS: FocusOption[] = [
  { id: 'definitions', label: 'Key terms', instruction: 'Prioritise key terms and their definitions.' },
  { id: 'processes', label: 'Processes & steps', instruction: 'Prioritise processes, sequences and how things work.' },
  { id: 'exam', label: 'Exam-style questions', instruction: 'Phrase questions the way an exam would ask them.' },
  { id: 'facts', label: 'Dates & names', instruction: 'Include important dates, people and places.' },
  { id: 'formulas', label: 'Formulas', instruction: 'Include formulas and when to use them.' },
  {
    id: 'beginner',
    label: "I'm new to this",
    instruction: "I'm new to this topic, so keep answers simple and explain jargon.",
  },
]

export const MAX_CONTEXT_LENGTH = 500

export function buildGuidance(context: string, focusIds: string[]): string {
  const focus = FOCUS_OPTIONS.filter((f) => focusIds.includes(f.id)).map((f) => f.instruction)
  return [context.trim(), ...focus].filter(Boolean).join('\n')
}

export function buildUserPrompt(notes: string, cardCount: number, guidance = ''): string {
  const about = guidance.trim() ? `<about_me>\n${guidance.trim()}\n</about_me>\n\n` : ''
  return `${about}Make up to ${cardCount} flashcards from these notes.\n\n<notes>\n${notes.trim()}\n</notes>`
}
