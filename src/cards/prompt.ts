export const SYSTEM_PROMPT = `You write study flashcards from a student's notes.

Each card tests one idea. The front is a clear question; the back is a short, correct answer (ideally under 25 words). Use only information from the notes, avoid duplicates and trivia, and prefer the concepts a teacher would test. Write in the same language as the notes. If the notes support fewer good cards than requested, return fewer rather than padding.`

export function buildUserPrompt(notes: string, cardCount: number): string {
  return `Make up to ${cardCount} flashcards from these notes.\n\n<notes>\n${notes.trim()}\n</notes>`
}
