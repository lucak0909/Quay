import { Link } from 'react-router-dom'
import { useProviderSettings } from '../settings'

export default function Home() {
  const providers = useProviderSettings()
  const hasKey = providers && Object.values(providers).some((p) => p.apiKey)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">StudyKey</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Turn your notes into flashcards and quizzes using your own LLM API key — you pay the provider
        directly, with no subscription markup.
      </p>
      {providers && !hasKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          No API key set yet.{' '}
          <Link to="/settings" className="font-medium underline">
            Add one in Settings
          </Link>{' '}
          to get started.
        </div>
      )}
    </div>
  )
}
