import { useState } from 'react'
import type { ProviderSettings } from '../db'
import { PROVIDERS, type ProviderInfo } from '../providers/catalog'
import {
  saveDefaultProvider,
  saveProviderSettings,
  useDefaultProvider,
  useProviderSettings,
} from '../settings'

export default function Settings() {
  const providers = useProviderSettings()
  const defaultProvider = useDefaultProvider()

  if (!providers || !defaultProvider) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          API keys are stored only in this browser (IndexedDB, unencrypted). They are sent only to the
          provider you choose when generating cards. Anyone with access to this browser profile can
          read them.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Default provider</legend>
        <div className="flex flex-wrap gap-4">
          {PROVIDERS.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="defaultProvider"
                checked={defaultProvider === p.id}
                onChange={() => saveDefaultProvider(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>

      {PROVIDERS.map((p) => (
        <ProviderForm key={p.id} info={p} initial={providers[p.id]} />
      ))}
    </div>
  )
}

function ProviderForm({ info, initial }: { info: ProviderInfo; initial: ProviderSettings }) {
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [model, setModel] = useState(initial.model)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty = apiKey !== initial.apiKey || model !== initial.model

  async function save() {
    await saveProviderSettings({ provider: info.id, apiKey: apiKey.trim(), model: model.trim() })
    setSaved(true)
  }

  const inputClass =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900'

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{info.name}</h2>
        <a href={info.keyUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          Get a key
        </a>
      </div>
      <label className="block space-y-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">API key</span>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            className={inputClass}
            placeholder={info.keyPlaceholder}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setSaved(false)
            }}
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">Model</span>
        <input
          className={inputClass}
          placeholder="Model ID from the provider's docs"
          value={model}
          onChange={(e) => {
            setModel(e.target.value)
            setSaved(false)
          }}
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Save
        </button>
        {saved && !dirty && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
      </div>
    </section>
  )
}
