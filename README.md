# StudyKey

A bring-your-own-API-key flashcard and quiz app. Paste notes or upload a PDF, generate flashcards or a quiz with an LLM, and study them with a spaced-repetition scheduler — all in the browser, with your own Anthropic/OpenAI/Gemini API key instead of a marked-up subscription.

## Why

Apps like RemNote and Quizlet charge a premium subscription to use AI features that are themselves thin wrappers around LLM API calls. This app does the same job, but you supply your own API key and pay the provider directly at cost. Your notes and key never leave your browser except to call the LLM provider you chose.

## Status

Early development. See the implementation plan for the current roadmap.

## Stack

Vite + React + TypeScript + Tailwind, IndexedDB for local storage (via Dexie.js), `pdf.js` for client-side PDF parsing. No backend, except a minimal stateless proxy function required for providers (OpenAI, Gemini) that block direct browser calls.

## License

MIT — see [LICENSE](./LICENSE).
