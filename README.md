# StudyKey

A bring-your-own-API-key flashcard and quiz app. Paste notes or upload a PDF, generate flashcards or a quiz with an LLM, and study them with a spaced-repetition scheduler — all in the browser, with your own Anthropic/OpenAI/Gemini API key instead of a marked-up subscription.

## Why

Apps like RemNote and Quizlet charge a premium subscription to use AI features that are themselves thin wrappers around LLM API calls. This app does the same job, but you supply your own API key and pay the provider directly at cost. Your notes and key never leave your browser except to call the LLM provider you chose.

## What it costs

A typical generation (about 10 pages of notes → 30 cards, roughly 7k tokens in / 3k out) costs about **$0.02 on Claude Haiku 4.5** or **$0.045 on Claude Sonnet 5**. You pay only for what you generate, with no monthly fee and no usage cap.

| Usage (9 study months/yr) | StudyKey (Haiku) | RemNote Pro with AI | Quizlet Plus (annual) |
|---|---|---|---|
| Light: 10 generations/mo | ~$2/yr | $240/yr | ~$36–45/yr |
| Moderate: 40/mo | ~$8/yr | $240/yr | ~$36–45/yr |
| Heavy: 120/mo | ~$24/yr | $240/yr | ~$36–45/yr |

The subscriptions also cap AI use: RemNote meters AI credits that reset monthly, and Quizlet limits Magic Notes uploads to 40k characters each with monthly conversion limits. With your own key, the limits are your provider's rate limits and your budget.

These are estimates based on assumed token counts. The app shows the estimated cost before every request, and you can set a monthly budget. We also recommend setting a spend limit in your provider's console.

## Status

Early development. See the implementation plan for the current roadmap.

## Stack

A desktop app built with Tauri around a Vite + React + TypeScript + Tailwind interface. Everything is stored on your computer (IndexedDB via Dexie.js), and your key is only ever sent straight to the AI company. There is no StudyKey server, database or account.

## Running it from source

You need Node.js, Rust (via rustup) and, on Windows, the Visual Studio C++ Build Tools.

```sh
npm install
npm run desktop        # open the desktop app with live reload
npm run desktop:build  # build an installer
npm run dev            # or just run the interface in a browser
```

On Windows, Defender sometimes wrongly flags temporary files made during the Rust build. If the build fails with "contains a virus", exclude the `src-tauri/target` folder.

## License

MIT — see [LICENSE](./LICENSE).
